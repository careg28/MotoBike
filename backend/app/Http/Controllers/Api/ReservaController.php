<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Reserva;
use Illuminate\Http\Request;
use App\Models\Modelo;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;
use Stripe\Stripe;
use Stripe\Checkout\Session;
use Carbon\Carbon;
use Stripe\Webhook;
use Illuminate\Http\Response;

class ReservaController extends Controller
{
    private const STRIPE_DOWN_PAYMENT_PERCENT = 0.20;
    private const PHYSICAL_SECURITY_DEPOSIT = 300.00;

    // GET /api/reservas?search=&estado=&modelo_id=&per_page=10
    public function index(Request $req)
    {
        $perPage = $req->input('per_page', 10);

        $q = Reserva::query()
            ->with(['modelo', 'moto'])
            ->buscar($req->input('search'))
            ->estado($req->input('estado'))
            ->delModelo($req->input('modelo_id'))
            ->latest();

        if ($perPage === 'all' || (int) $perPage === -1) {
            return response()->json(['data' => $q->get()]);
        }

        return $q->paginate((int) $perPage);
    }

    // GET /api/reservas/{reserva}
    public function show(Reserva $reserva)
    {
        return $reserva->load(['modelo', 'moto']);
    }

    // POST /api/reservas
    public function store(Request $request)
    {
        $data = $request->validate([
            'modelo_id'      => ['required', 'exists:modelos,id'],
            'moto_id'        => ['nullable', 'exists:motos,id'],
            'fecha_inicio'   => ['required', 'date'],
            'fecha_fin'      => ['required', 'date', 'after:fecha_inicio'],
            'hora_recogida'  => ['required', 'date_format:H:i'],

            'cliente_nombre' => ['required', 'string', 'max:200'],
            'cliente_email'  => ['required', 'email', 'max:200'],
            'cliente_tel'    => ['required', 'string', 'max:50'],
            'cliente_documento' => ['required', 'string', 'max:100'],
            'cliente_nacionalidad' => ['required', 'string', 'max:100'],
            'cliente_direccion_origen' => ['required', 'string', 'max:255'],
            'cliente_direccion_hospedaje' => ['required', 'string', 'max:255'],
            'notas'          => ['required', 'string'],

            'precio_total'   => ['nullable', 'numeric', 'min:0'],
            'deposito'       => ['nullable', 'numeric', 'min:0'],
            'moneda'         => ['nullable', 'string', 'max:10'],

            // Entrega
            'tipo_entrega'      => ['required', 'in:pickup,delivery'],
            'direccion_entrega' => ['nullable', 'string', 'max:255'],
            'codigo_postal'     => ['nullable', 'string', 'max:10'],
        ]);

        $inicio = Carbon::parse($data['fecha_inicio'])->startOfDay();
        $fin    = Carbon::parse($data['fecha_fin'])->startOfDay();
        $this->ensurePickupTimeAllowed($data['hora_recogida']);

        $modelo = Modelo::findOrFail($data['modelo_id']);

        $stockOperativas = $modelo->motos()
            ->whereNotIn('estado', ['mantenimiento', 'retirada'])
            ->count();

        if ($stockOperativas <= 0) {
            return response()->json([
                'message' => 'No hay unidades operativas de este modelo.'
            ], 422);
        }

        $bloqueantes = [
            Reserva::ESTADO_PAID,
            Reserva::ESTADO_ASSIGNED,
            'pendiente', 'confirmada', 'recogida',
        ];

        $reservasSolapadas = Reserva::query()
            ->where('modelo_id', $modelo->id)
            ->whereIn('estado', $bloqueantes)
            ->whereDate('fecha_inicio', '<', $fin)
            ->whereDate('fecha_fin', '>', $inicio)
            ->count();

        if ($reservasSolapadas >= $stockOperativas) {
            return response()->json([
                'message' => 'No hay disponibilidad para las fechas seleccionadas.'
            ], 422);
        }

        $data['fecha_inicio'] = $inicio->toDateString();
        $data['fecha_fin']    = $fin->toDateString();
        $data['estado']       = Reserva::ESTADO_HOLD;

        $dias = $inicio->diffInDays($fin);
        if ($dias < 2) {
            return response()->json([
                'message' => 'La reserva mínima es de 2 días.'
            ], 422);
        }
        if ($dias <= 0) {
            return response()->json(['message' => 'Rango de fechas inválido.'], 422);
        }

        $precioDia = (float) ($modelo->precio_base ?? 0);
        $subtotal  = $dias * $precioDia;

       // =========================
// ENTREGA POR CÓDIGO POSTAL
// =========================
$tipoEntrega = $data['tipo_entrega'] ?? 'pickup';
$direccionEntrega = $data['direccion_entrega'] ?? null;
$codigoPostal = isset($data['codigo_postal']) ? trim((string) $data['codigo_postal']) : null;
$costeEntrega = 0.0;
$codigosPostalesEntrega = [
    '46015', '46009', '46019', '46025',
    '46014', '46018', '46008', '46003',
    '46010', '46020', '46001', '46002',
    '46004', '46007', '46006', '46005',
    '46017', '46026', '46013', '46021',
    '46022', '46011', '46023', '46024',
];

if ($tipoEntrega === 'delivery') {

    if (!$direccionEntrega || !$codigoPostal) {
        return response()->json([
            'message' => 'Debes indicar dirección y código postal para entrega a domicilio.'
        ], 422);
    }

    if (!in_array($codigoPostal, $codigosPostalesEntrega, true)) {
        return response()->json([
            'message' => 'No realizamos entregas en ese código postal.'
        ], 422);
    }

    $costeEntrega = 25.0;
}

$data['tipo_entrega'] = $tipoEntrega;
$data['direccion_entrega'] = $direccionEntrega;
$data['codigo_postal'] = $codigoPostal;
$data['coste_entrega'] = $costeEntrega;

// precio total incluyendo entrega
$data['precio_total'] = array_key_exists('precio_total', $data) && $data['precio_total'] !== null
    ? (float) $data['precio_total']
    : ($subtotal + $costeEntrega);

$data['deposito'] = array_key_exists('deposito', $data) && $data['deposito'] !== null
    ? (float) $data['deposito']
    : (float) ($modelo->deposito_sugerido ?? 0);

$data['moneda'] = $data['moneda'] ?? 'EUR';

$reserva = Reserva::create($data)->load(['modelo', 'moto']);

       /* // === Email cliente ===
        try {
            $frontend = config('app.frontend_url') ?? env('FRONTEND_URL') ?? config('app.url');
            $trackUrl = rtrim((string) $frontend, '/') . '/seguimiento?code=' . $reserva->codigo;

            $txt = [];
            $txt[] = "¡Gracias por tu solicitud de reserva!";
            $txt[] = "";
            $txt[] = "Código de reserva: {$reserva->codigo}";
            $txt[] = "Modelo: {$modelo->marca} {$modelo->nombre}";
            $txt[] = "Fechas: {$reserva->fecha_inicio} → {$reserva->fecha_fin} (el día de devolución no se cobra)";

            if (!empty($reserva->precio_total)) {
                $txt[] = "Importe estimado: {$reserva->precio_total} " . ($reserva->moneda ?: 'EUR');
            }
            if (!empty($reserva->deposito)) {
                $txt[] = "Depósito estimado: {$reserva->deposito} " . ($reserva->moneda ?: 'EUR');
            }

            if (($reserva->tipo_entrega ?? 'pickup') === 'delivery') {
                $txt[] = "Entrega: A domicilio";
                $txt[] = "Dirección: {$reserva->direccion_entrega}";
                $txt[] = "Código postal: {$reserva->codigo_postal}";
                $txt[] = "Coste entrega: {$reserva->coste_entrega} " . ($reserva->moneda ?: 'EUR');
            } else {
                $txt[] = "Entrega: Recogida en tienda";
            }

            $txt[] = "";
            $txt[] = "Puedes consultar el estado y cancelar tu reserva con este enlace:";
            $txt[] = $trackUrl;
            $txt[] = "";
            $txt[] = "Importante: la reserva está en estado 'hold' hasta que el equipo la confirme.";
            $txt[] = "Si necesitas ayuda, responde a este email.";

            Mail::raw(implode("\n", $txt), function ($m) use ($reserva) {
                $m->to($reserva->cliente_email, $reserva->cliente_nombre)
                    ->subject('Confirmación de solicitud de reserva');
            });
        } catch (\Throwable $e) {
            // \Log::warning('Fallo email cliente: ' . $e->getMessage());
        }
*/
   /*     // === Email admin ===
        try {
            $admin = config('mail.admin_address') ?? env('ADMIN_EMAIL');
            if ($admin) {
                $lines = [
                    "Nueva solicitud de reserva (HOLD)",
                    "Código: {$reserva->codigo}",
                    "Modelo: {$modelo->marca} {$modelo->nombre} (ID {$modelo->id})",
                    "Fechas: {$reserva->fecha_inicio} → {$reserva->fecha_fin} (fin exclusivo)",
                    "Cliente: {$reserva->cliente_nombre} | {$reserva->cliente_email}" . ($reserva->cliente_tel ? " | {$reserva->cliente_tel}" : ""),
                    "Entrega: " . (($reserva->tipo_entrega ?? 'pickup') === 'delivery' ? 'A domicilio' : 'Recogida en tienda'),
                ];

                if (($reserva->tipo_entrega ?? 'pickup') === 'delivery') {
                    $lines[] = "Dirección: {$reserva->direccion_entrega}";
                    $lines[] = "Código postal: {$reserva->codigo_postal}";
                    $lines[] = "Coste entrega: {$reserva->coste_entrega} " . ($reserva->moneda ?: 'EUR');
                }

                if (!empty($reserva->notas)) {
                    $lines[] = "Notas: {$reserva->notas}";
                }

                $body = implode("\n", $lines);

                Mail::raw($body, function ($m) use ($admin) {
                    $m->to($admin)->subject('Nueva reserva (HOLD)');
                });
            }
        } catch (\Throwable $e) {
            // \Log::warning('Fallo email admin: ' . $e->getMessage());
        }
*/
        return response()->json($reserva, 201);
    }
        

    // Stripe Checkout
   public function checkout(Request $request)
{
    $data = $request->validate([
        'modelo_id'        => ['required', 'exists:modelos,id'],
        'fecha_inicio'     => ['required', 'date'],
        'fecha_fin'        => ['required', 'date', 'after:fecha_inicio'],
        'hora_recogida'    => ['required', 'date_format:H:i'],

        'cliente_nombre'   => ['required', 'string', 'max:200'],
        'cliente_email'    => ['required', 'email', 'max:200'],
        'cliente_tel'      => ['required', 'string', 'max:50'],
        'cliente_documento' => ['required', 'string', 'max:100'],
        'cliente_nacionalidad' => ['required', 'string', 'max:100'],
        'cliente_direccion_origen' => ['required', 'string', 'max:255'],
        'cliente_direccion_hospedaje' => ['required', 'string', 'max:255'],
        'notas'            => ['required', 'string'],

        // entrega
        'tipo_entrega'      => ['required', 'in:pickup,delivery'],
        'direccion_entrega' => ['nullable', 'string', 'max:255'],
        'codigo_postal'     => ['nullable', 'string', 'max:10'],
        'coste_entrega'     => ['nullable', 'numeric', 'min:0'],
    ]);

    $inicio = Carbon::parse($data['fecha_inicio'])->startOfDay();
    $fin    = Carbon::parse($data['fecha_fin'])->startOfDay();
    $this->ensurePickupTimeAllowed($data['hora_recogida']);

    $modelo = Modelo::findOrFail($data['modelo_id']);

    $stockOperativas = $modelo->motos()
        ->whereNotIn('estado', ['mantenimiento', 'retirada'])
        ->count();

    if ($stockOperativas <= 0) {
        return response()->json([
            'message' => 'No hay unidades operativas de este modelo.'
        ], 422);
    }

    $bloqueantes = [
        Reserva::ESTADO_PAID,
        Reserva::ESTADO_ASSIGNED,
        'pendiente', 'confirmada', 'recogida',
    ];

    $reservasSolapadas = Reserva::query()
        ->where('modelo_id', $modelo->id)
        ->whereIn('estado', $bloqueantes)
        ->whereDate('fecha_inicio', '<', $fin)
        ->whereDate('fecha_fin', '>', $inicio)
        ->count();

    if ($reservasSolapadas >= $stockOperativas) {
        return response()->json([
            'message' => 'No hay disponibilidad para las fechas seleccionadas.'
        ], 422);
    }

    $dias = $inicio->diffInDays($fin);

    if ($dias < 2) {
        return response()->json([
            'message' => 'La reserva mínima es de 2 días.'
        ], 422);
    }

    $precioDia   = (float) ($modelo->precio_base ?? 0);
    $precioTotal = $dias * $precioDia;
    $deposito    = self::PHYSICAL_SECURITY_DEPOSIT;
    $moneda      = 'EUR';

    // =========================
    // ENTREGA POR CÓDIGO POSTAL
    // =========================
    $tipoEntrega = $data['tipo_entrega'] ?? 'pickup';
    $direccionEntrega = $data['direccion_entrega'] ?? null;
    $codigoPostal = isset($data['codigo_postal']) ? trim((string) $data['codigo_postal']) : null;
    $costeEntrega = 0.0;

    $codigosPostalesEntrega = [
        '46015', '46009', '46019', '46025',
        '46014', '46018', '46008', '46003',
        '46010', '46020', '46001', '46002',
        '46004', '46007', '46006', '46005',
        '46017', '46026', '46013', '46021',
        '46022', '46011', '46023', '46024',
    ];

    if ($tipoEntrega === 'delivery') {
        if (!$direccionEntrega || !$codigoPostal) {
            return response()->json([
                'message' => 'Debes indicar dirección y código postal para entrega a domicilio.'
            ], 422);
        }

        if (!in_array($codigoPostal, $codigosPostalesEntrega, true)) {
            return response()->json([
                'message' => 'No realizamos entregas en ese código postal.'
            ], 422);
        }

        $costeEntrega = 25.0;
    }

    // total final incluyendo envío
    $precioTotal = $precioTotal + $costeEntrega;
    $anticipo = $this->calculateStripeDownPayment($precioTotal);
    $restante = round($precioTotal - $anticipo, 2);
    $depositoEntrega = self::PHYSICAL_SECURITY_DEPOSIT;

    $reserva = Reserva::create([
        'modelo_id'         => $modelo->id,
        'fecha_inicio'      => $inicio->toDateString(),
        'fecha_fin'         => $fin->toDateString(),
        'hora_recogida'     => $data['hora_recogida'],
        'precio_total'      => $precioTotal,
        'deposito'          => $deposito,
        'moneda'            => $moneda,
        'estado'            => Reserva::ESTADO_HOLD,

        'cliente_nombre'    => $data['cliente_nombre'],
        'cliente_email'     => $data['cliente_email'],
        'cliente_tel'       => $data['cliente_tel'],
        'cliente_documento' => $data['cliente_documento'],
        'cliente_nacionalidad' => $data['cliente_nacionalidad'],
        'cliente_direccion_origen' => $data['cliente_direccion_origen'],
        'cliente_direccion_hospedaje' => $data['cliente_direccion_hospedaje'],
        'notas'             => $data['notas'],

        // entrega
        'tipo_entrega'      => $tipoEntrega,
        'direccion_entrega' => $direccionEntrega,
        'codigo_postal'     => $codigoPostal,
        'coste_entrega'     => $costeEntrega,

        // pago
        'payment_status'    => 'pending',
        'payment_provider'  => 'stripe',
        'hold_expires_at'   => now()->addMinutes(30),
    ]);

    Stripe::setApiKey(config('services.stripe.secret'));

    $frontend = rtrim((string) config('app.frontend_url', config('app.url')), '/');

    $session = Session::create([
        'mode' => 'payment',
        'client_reference_id' => (string) $reserva->id,
        'customer_email' => $reserva->cliente_email,

        'line_items' => [[
            'price_data' => [
                'currency' => strtolower($moneda),
                'product_data' => [
                    'name' => $modelo->marca . ' ' . $modelo->nombre,
                    'description' => 'Reserva ' . $reserva->codigo . ' | ' .
                        $inicio->format('d/m/Y') . ' → ' . $fin->format('d/m/Y'),
                ],
                'unit_amount' => (int) round($anticipo * 100),
            ],
            'quantity' => 1,
        ]],

        'success_url' => $frontend . '/reserva/pago-ok?session_id={CHECKOUT_SESSION_ID}',
        'cancel_url'  => $frontend . '/reserva/pago-cancelado?codigo=' . urlencode($reserva->codigo),

        'metadata' => [
            'reserva_id'    => (string) $reserva->id,
            'codigo'        => $reserva->codigo,
            'modelo_id'     => (string) $modelo->id,
            'tipo_entrega'  => $tipoEntrega,
            'codigo_postal' => (string) ($codigoPostal ?? ''),
            'precio_total'  => (string) $precioTotal,
            'anticipo'      => (string) $anticipo,
            'restante'      => (string) $restante,
        ],
    ]);

    $reserva->checkout_session_id = $session->id;
    $reserva->save();

    return response()->json([
        'reserva_id'   => $reserva->id,
        'codigo'       => $reserva->codigo,
        'checkout_url' => $session->url,
        'precio_total' => $precioTotal,
        'anticipo'     => $anticipo,
        'restante'     => $restante,
        'deposito'     => $depositoEntrega,
    ], 201);
}

    // PATCH /api/reservas/{reserva}
    public function update(Request $req, Reserva $reserva)
    {
        $data = $req->validate([
            'estado'            => ['sometimes', 'in:hold,paid,assigned,canceled,expired'],
            'moto_id'           => ['nullable', 'exists:motos,id'],
            'hora_recogida'     => ['nullable', 'date_format:H:i'],
            'payment_intent_id' => ['nullable', 'string', 'max:255'],
            'payment_status'    => ['nullable', 'string', 'max:255'],
            'notas'             => ['nullable', 'string'],
        ]);

        if (!empty($data['hora_recogida'])) {
            $this->ensurePickupTimeAllowed($data['hora_recogida']);
        }

        DB::transaction(function () use ($reserva, $data) {
            $prevMotoId = $reserva->moto_id;

            $reserva->fill($data)->save();

            if ($prevMotoId && $prevMotoId !== $reserva->moto_id) {
                $this->maybeLiberateMoto($prevMotoId);
            }

           /* if ($reserva->estado === Reserva::ESTADO_ASSIGNED && $reserva->moto_id) {
                \App\Models\Moto::where('id', $reserva->moto_id)->update(['estado' => 'reservada']);
            }*/

            if (in_array($reserva->estado, [Reserva::ESTADO_CANCELED, Reserva::ESTADO_EXPIRED], true)) {
                if ($reserva->moto_id) {
                    $this->maybeLiberateMoto($reserva->moto_id);
                }
            }
        });

        return response()->json($reserva->load(['modelo', 'moto']));
    }

    // DELETE /api/reservas/{reserva}
    public function destroy(Reserva $reserva)
    {
        $motoId = $reserva->moto_id;
        $reserva->delete();

        if ($motoId) {
            $this->maybeLiberateMoto($motoId);
        }

        return response()->noContent();
    }

    public function lookup(string $codigo)
    {
        $codigo = strtoupper(trim($codigo));

        $r = Reserva::query()
            ->with(['modelo:id,slug,marca,nombre'])
            ->where('codigo', $codigo)
            ->firstOrFail();

        $cancelableEstados = [
            Reserva::ESTADO_HOLD,
        ];

        $hoy = now()->startOfDay();
        $aunNoEmpieza = $r->fecha_inicio->startOfDay()->greaterThan($hoy);
        $puedeCancelar = in_array($r->estado, $cancelableEstados, true) && $aunNoEmpieza;

        return response()->json([
            'id'            => $r->id,
            'codigo'        => $r->codigo,
            'estado'        => $r->estado,
            'fecha_inicio'  => $r->fecha_inicio->toDateString(),
            'fecha_fin'     => $r->fecha_fin->toDateString(),
            'hora_recogida' => $r->hora_recogida,
            'precio_total'  => $r->precio_total,
            'deposito'      => $r->deposito,
            'moneda'        => $r->moneda ?: 'EUR',
            'tipo_entrega'      => $r->tipo_entrega,
            'direccion_entrega' => $r->direccion_entrega,
            'codigo_postal'     => $r->codigo_postal,
            'coste_entrega'     => $r->coste_entrega,

            'modelo' => $r->modelo ? [
                'id'     => $r->modelo->id,
                'slug'   => $r->modelo->slug,
                'marca'  => $r->modelo->marca,
                'nombre' => $r->modelo->nombre,
            ] : null,

            'puede_cancelar' => $puedeCancelar,
        ]);
    }

    public function cancelByCode(Request $request, string $codigo)
    {
        $codigo = strtoupper(trim($codigo));

        $r = Reserva::query()
            ->with(['modelo:id,slug,marca,nombre'])
            ->where('codigo', $codigo)
            ->firstOrFail();

        $hoy = now()->startOfDay();
        $aunNoEmpieza = $r->fecha_inicio->startOfDay()->greaterThan($hoy);

        if ($r->estado !== Reserva::ESTADO_HOLD || !$aunNoEmpieza) {
            return response()->json([
                'message' => 'Esta reserva no puede cancelarse (consulta condiciones).'
            ], 422);
        }

        $r->estado = Reserva::ESTADO_CANCELED;
        $r->save();

        try {
            $admin = config('mail.admin_address') ?? env('ADMIN_EMAIL');
            if ($admin) {
                $bodyAdmin = implode("\n", [
                    "Cancelación de reserva por cliente",
                    "Código: {$r->codigo}",
                    "Modelo: {$r->modelo->marca} {$r->modelo->nombre}",
                    "Fechas: {$r->fecha_inicio->toDateString()} → {$r->fecha_fin->toDateString()}",
                    "Estado: {$r->estado}",
                ]);

                Mail::raw($bodyAdmin, function ($m) use ($admin) {
                    $m->to($admin)->subject('Reserva cancelada por cliente');
                });
            }

            $bodyCli = implode("\n", [
                "Tu reserva ha sido cancelada correctamente.",
                "Código: {$r->codigo}",
                "Modelo: {$r->modelo->marca} {$r->modelo->nombre}",
                "Fechas: {$r->fecha_inicio->toDateString()} → {$r->fecha_fin->toDateString()}",
                "",
                "Si no solicitaste esta cancelación, responde a este email.",
            ]);

            Mail::raw($bodyCli, function ($m) use ($r) {
                $m->to($r->cliente_email, $r->cliente_nombre)
                    ->subject('Confirmación de cancelación de reserva')
                    ->replyTo(config('mail.from.address'), config('mail.from.name'));
            });
        } catch (\Throwable $e) {
            // \Log::warning('Email cancelación falló: ' . $e->getMessage());
        }

        return response()->json([
            'codigo'       => $r->codigo,
            'estado'       => $r->estado,
            'fecha_inicio' => $r->fecha_inicio->toDateString(),
            'fecha_fin'    => $r->fecha_fin->toDateString(),
            'modelo'       => [
                'id' => $r->modelo->id,
                'slug' => $r->modelo->slug,
                'marca' => $r->modelo->marca,
                'nombre' => $r->modelo->nombre
            ]
        ]);
    }

    public function stripeSessionDetails(string $sessionId)
{
    Stripe::setApiKey(config('services.stripe.secret'));

    try {
        $session = \Stripe\Checkout\Session::retrieve($sessionId);
    } catch (\Throwable $e) {
        return response()->json([
            'message' => 'No se pudo recuperar la sesión de pago.'
        ], 404);
    }

    $reservaId = $session->metadata->reserva_id ?? $session->client_reference_id ?? null;

    if (!$reservaId) {
        return response()->json([
            'message' => 'No se encontró la reserva asociada.'
        ], 404);
    }

    $reserva = Reserva::with(['modelo:id,slug,marca,nombre', 'moto:id,slug,matricula'])
        ->find($reservaId);

    if (!$reserva) {
        return response()->json([
            'message' => 'Reserva no encontrada.'
        ], 404);
    }

    return response()->json([
        'id' => $reserva->id,
        'codigo' => $reserva->codigo,
        'estado' => $reserva->estado,
        'fecha_inicio' => $reserva->fecha_inicio?->toDateString(),
        'fecha_fin' => $reserva->fecha_fin?->toDateString(),
        'hora_recogida' => $reserva->hora_recogida,
        'precio_total' => $reserva->precio_total,
        'deposito' => $reserva->deposito,
        'anticipo_stripe' => $this->calculateStripeDownPayment((float) $reserva->precio_total),
        'restante_entrega' => $this->calculateRemainingOnDelivery((float) $reserva->precio_total),
        'fianza_entrega' => self::PHYSICAL_SECURITY_DEPOSIT,
        'moneda' => $reserva->moneda ?: 'EUR',
        'tipo_entrega' => $reserva->tipo_entrega,
        'direccion_entrega' => $reserva->direccion_entrega,
        'codigo_postal' => $reserva->codigo_postal,
        'coste_entrega' => $reserva->coste_entrega,
        'cliente_nombre' => $reserva->cliente_nombre,
        'cliente_email' => $reserva->cliente_email,
        'cliente_tel' => $reserva->cliente_tel,
        'cliente_documento' => $reserva->cliente_documento,
        'cliente_nacionalidad' => $reserva->cliente_nacionalidad,
        'cliente_direccion_origen' => $reserva->cliente_direccion_origen,
        'cliente_direccion_hospedaje' => $reserva->cliente_direccion_hospedaje,
        'modelo' => $reserva->modelo ? [
            'id' => $reserva->modelo->id,
            'slug' => $reserva->modelo->slug,
            'marca' => $reserva->modelo->marca,
            'nombre' => $reserva->modelo->nombre,
        ] : null,
    ]);
}

    // GET /api/reservas/{reserva}/motos-libres
    public function motosLibres(Reserva $reserva)
    {
        $inicio = $reserva->fecha_inicio->startOfDay();
        $fin    = $reserva->fecha_fin->startOfDay();

        $bloqueantes = [
            Reserva::ESTADO_PAID,
            Reserva::ESTADO_ASSIGNED,
            'pendiente', 'confirmada', 'recogida',
        ];

        $motos = \App\Models\Moto::query()
            ->where('modelo_id', $reserva->modelo_id)
            ->whereNotIn('estado', ['mantenimiento', 'retirada', 'baja', 'inactiva'])
            ->whereDoesntHave('reservas', function ($q) use ($inicio, $fin, $bloqueantes) {
                $q->whereIn('estado', $bloqueantes)
                    ->where('fecha_inicio', '<', $fin)
                    ->where('fecha_fin', '>', $inicio);
            })
            ->orderBy('id', 'asc')
            ->get(['id', 'slug', 'matricula', 'color', 'estado']);

        return response()->json(['data' => $motos]);
    }

    private function maybeLiberateMoto(int $motoId): void
    {
        $bloqueantes = [
            Reserva::ESTADO_ASSIGNED,
            Reserva::ESTADO_PAID,
            'pendiente', 'confirmada', 'recogida',
        ];

        $hayOtra = Reserva::query()
            ->where('moto_id', $motoId)
            ->whereIn('estado', $bloqueantes)
            ->whereDate('fecha_fin', '>', now()->toDateString())
            ->exists();

        if (!$hayOtra) {
            \App\Models\Moto::where('id', $motoId)->update(['estado' => 'disponible']);
        }
    }
    public function stripeWebhook(Request $request)
    {
    $payload = $request->getContent();
    $sigHeader = $request->header('Stripe-Signature');
    $endpointSecret = env('STRIPE_WEBHOOK_SECRET');

    try {
        $event = Webhook::constructEvent($payload, $sigHeader, $endpointSecret);
    } catch (\UnexpectedValueException $e) {
        return response()->json(['message' => 'Invalid payload'], 400);
    } catch (\Stripe\Exception\SignatureVerificationException $e) {
        return response()->json(['message' => 'Invalid signature'], 400);
    }

    if ($event->type === 'checkout.session.completed') {
        $session = $event->data->object;

        $reservaId = $session->metadata->reserva_id ?? $session->client_reference_id ?? null;

        if ($reservaId) {
            $reserva = Reserva::find($reservaId);

            if ($reserva && $reserva->estado !== Reserva::ESTADO_PAID) {
                $reserva->estado = Reserva::ESTADO_PAID;
                $reserva->payment_status = 'partial_paid';
                $reserva->payment_intent_id = $session->payment_intent ?? null;
                $reserva->checkout_session_id = $session->id ?? $reserva->checkout_session_id;
                $reserva->paid_at = now();
                $reserva->save();

                // Email cliente
                try {
                    $modelo = $reserva->modelo;
                    $precioTotal = (float) $reserva->precio_total;
                    $anticipoStripe = $this->calculateStripeDownPayment($precioTotal);
                    $restanteEntrega = $this->calculateRemainingOnDelivery($precioTotal);

                    $frontend = config('app.frontend_url') ?? env('FRONTEND_URL') ?? config('app.url');
                    $trackUrl = rtrim((string) $frontend, '/') . '/seguimiento?code=' . $reserva->codigo;

                    $txt = [];
                    $txt[] = "Hola,";
                    $txt[] = "";
                    $txt[] = "Tu reserva de moto con FEO'S Renta Bike ha sido confirmada correctamente.";
                    $txt[] = "";
                    $txt[] = "Te recordamos que al realizar la reserva online has abonado unicamente el 20% del total. El 80% restante debera pagarse en el momento de la entrega o recogida de la moto. Este importe incluye el resto de los dias de alquiler y, en caso de haberlo solicitado, el servicio de entrega a domicilio.";
                    $txt[] = "";
                    $txt[] = "En caso de cancelacion por parte del cliente, el importe del 20% abonado en concepto de reserva tendra la consideracion de senal/arras y no sera reembolsable, salvo en supuestos de fuerza mayor debidamente acreditados o cuando la cancelacion sea imputable a FEO'S Renta Bike.";
                    $txt[] = "";
                    $txt[] = "Puedes realizar este pago mediante:";
                    $txt[] = "- Bizum";
                    $txt[] = "- Tarjeta";
                    $txt[] = "- Transferencia";
                    $txt[] = "- Efectivo";
                    $txt[] = "";
                    $txt[] = "Asimismo, en el momento de la entrega se realizara la retencion de una fianza de 300 EUR, la cual sera reembolsada al finalizar el alquiler siempre que el vehiculo se devuelva en buen estado y sin incidencias.";
                    $txt[] = "";
                    $txt[] = "Resumen de tu reserva:";
                    $txt[] = "";
                    $txt[] = "Codigo de reserva: {$reserva->codigo}";
                    $txt[] = "Modelo: {$modelo->marca} {$modelo->nombre}";
                    $txt[] = "Dias de uso: " . $this->formatDateValue($reserva->fecha_inicio) . " -> " . $this->formatDateValue(Carbon::parse($reserva->fecha_fin)->subDay());
                    $txt[] = "Recogida: " . $this->formatDateValue($reserva->fecha_inicio) . " a las " . ($reserva->hora_recogida ?: '16:00');
                    $txt[] = "Devolucion: " . $this->formatDateValue($reserva->fecha_fin) . " a las " . ($reserva->hora_recogida ?: '16:00');
                    $txt[] = "Importe total: " . $this->formatMoney($precioTotal, $reserva->moneda);
                    $txt[] = "Pagado (20%): " . $this->formatMoney($anticipoStripe, $reserva->moneda);
                    $txt[] = "Pendiente de pago (80% + extras): " . $this->formatMoney($restanteEntrega, $reserva->moneda);
                    $txt[] = "";

                   if (($reserva->tipo_entrega ?? 'pickup') === 'delivery') {

                        $txt[] = "Entrega:";
                        $txt[] = "- Tipo de entrega: A domicilio";
                        $txt[] = "- Direccion de entrega: {$reserva->direccion_entrega}";
                        $txt[] = "- Codigo postal: {$reserva->codigo_postal}";
                        $txt[] = "- Coste de entrega incluido en el total: " . $this->formatMoney((float) $reserva->coste_entrega, $reserva->moneda);
                        $txt[] = "";

                    } else {

                        $txt[] = "Recogida:";
                        $txt[] = "- Tipo de entrega: Recogida en tienda";
                        $txt[] = "- Direccion de recogida: Calle del Doctor Oloriz & Avinguda Dr. Peset Aleixandre, La Saidia, 46009 Valencia";
                        $txt[] = "- Referencia: Entre el restaurante Casa Comer Comer y la autoescuela Benlloch";
                        $txt[] = "";

                    }

                    $txt[] = "Puedes consultar tu reserva aqui:";
                    $txt[] = $trackUrl;
                    $txt[] = "";
                    $txt[] = "Para cualquier duda, estamos a tu disposicion.";
                    $txt[] = "";
                    $txt[] = "Un saludo,";
                    $txt[] = "FEO'S Renta Bike";

                    Mail::raw(implode("\n", $txt), function ($m) use ($reserva) {
                        $m->to($reserva->cliente_email, $reserva->cliente_nombre)
                          ->subject('Reserva confirmada y anticipo recibido');
                    });
                } catch (\Throwable $e) {
                    \Log::warning('Email cliente pago OK falló: ' . $e->getMessage());
                }

                // Email admin
                try {
                    $admin = config('mail.admin_address') ?? env('ADMIN_EMAIL');
                    if ($admin) {
                        $modelo = $reserva->modelo;
                        $precioTotal = (float) $reserva->precio_total;
                        $anticipoStripe = $this->calculateStripeDownPayment($precioTotal);
                        $restanteEntrega = $this->calculateRemainingOnDelivery($precioTotal);

                        $lines = [
                            "Nueva reserva confirmada",
                            "Código: {$reserva->codigo}",
                            "Modelo: {$modelo->marca} {$modelo->nombre}",
                            "Dias de uso: " . $this->formatDateValue($reserva->fecha_inicio) . " -> " . $this->formatDateValue(Carbon::parse($reserva->fecha_fin)->subDay()),
                            "Recogida: " . $this->formatDateValue($reserva->fecha_inicio) . " a las " . ($reserva->hora_recogida ?: '16:00'),
                            "Devolucion: " . $this->formatDateValue($reserva->fecha_fin) . " a las " . ($reserva->hora_recogida ?: '16:00'),
                            "Cliente: {$reserva->cliente_nombre} | {$reserva->cliente_email}" . ($reserva->cliente_tel ? " | {$reserva->cliente_tel}" : ""),
                            "Documento: {$reserva->cliente_documento}",
                            "Nacionalidad: {$reserva->cliente_nacionalidad}",
                            "Dirección de origen: {$reserva->cliente_direccion_origen}",
                            "Dirección de hospedaje: {$reserva->cliente_direccion_hospedaje}",
                            "Importe total reserva: " . $this->formatMoney($precioTotal, $reserva->moneda),
                            "Cobrado por Stripe (20%): " . $this->formatMoney($anticipoStripe, $reserva->moneda),
                            "Pendiente en entrega: " . $this->formatMoney($restanteEntrega, $reserva->moneda),
                            "Fianza presencial reembolsable: " . $this->formatMoney(self::PHYSICAL_SECURITY_DEPOSIT, $reserva->moneda),
                        ];

                        if (($reserva->tipo_entrega ?? 'pickup') === 'delivery') {
                            $lines[] = "Entrega: A domicilio";
                            $lines[] = "Dirección: {$reserva->direccion_entrega}";
                            $lines[] = "Código postal: {$reserva->codigo_postal}";
                            $lines[] = "Coste entrega: {$reserva->coste_entrega} " . ($reserva->moneda ?: 'EUR');
                        } else {
                            $lines[] = "Entrega: Recogida en tienda";
                        }

                        Mail::raw(implode("\n", $lines), function ($m) use ($admin) {
                            $m->to($admin)->subject('Nueva reserva confirmada');
                        });
                    }
                } catch (\Throwable $e) {
                    \Log::warning('Email admin pago OK falló: ' . $e->getMessage());
                }
            }
        }
    }

    return response()->json(['received' => true], 200);
    }

    private function calculateStripeDownPayment(float $precioTotal): float
    {
        return round($precioTotal * self::STRIPE_DOWN_PAYMENT_PERCENT, 2);
    }

    private function calculateRemainingOnDelivery(float $precioTotal): float
    {
        return round($precioTotal - $this->calculateStripeDownPayment($precioTotal), 2);
    }

    private function ensurePickupTimeAllowed(string $time): void
    {
        if ($time < '08:00' || $time > '19:00') {
            throw new \Illuminate\Http\Exceptions\HttpResponseException(response()->json([
                'message' => 'La hora de recogida debe estar entre las 08:00 y las 19:00.'
            ], 422));
        }
    }

    private function formatDateValue($value): string
    {
        if ($value instanceof Carbon) {
            return $value->format('d/m/Y');
        }

        if (empty($value)) {
            return '-';
        }

        return Carbon::parse($value)->format('d/m/Y');
    }

    private function formatMoney(float $amount, ?string $currency = 'EUR'): string
    {
        $currency = $currency ?: 'EUR';

        return number_format($amount, 2, '.', '') . ' ' . $currency;
    }
}
