<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Reserva;
use Illuminate\Http\Request;
use App\Models\Modelo;
use Illuminate\Support\Facades\Mail;

// ✅ agrega UNA de estas dos (elige una y usa esa en el código):
use Carbon\Carbon;  

class ReservaController extends Controller
{
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

        if ($perPage === 'all' || (int)$perPage === -1) {
            return response()->json(['data' => $q->get()]);
        }

        return $q->paginate((int)$perPage);
    }

    // GET /api/reservas/{reserva}
    public function show(Reserva $reserva)
    {
        return $reserva->load(['modelo', 'moto']);
    }

    // POST /api/reservas  (crea booking en HOLD; el pago vendrá después)
    public function store(Request $request)
    {
        // 1) Validar entrada básica
        $data = $request->validate([
            'modelo_id'      => ['required', 'exists:modelos,id'],
            'moto_id'        => ['nullable', 'exists:motos,id'], // normalmente null (se asigna luego)
            'fecha_inicio'   => ['required', 'date'],
            'fecha_fin'      => ['required', 'date', 'after:fecha_inicio'],

            'cliente_nombre' => ['required', 'string', 'max:200'],
            'cliente_email'  => ['required', 'email',  'max:200'],
            'cliente_tel'    => ['nullable', 'string', 'max:50'],

            'notas'          => ['nullable', 'string'],

            // opcionales (se podrán calcular/usar cuando integremos precios/pagos)
            'precio_total'   => ['nullable', 'numeric', 'min:0'],
            'deposito'       => ['nullable', 'numeric', 'min:0'],
            'moneda'         => ['nullable', 'string', 'max:10'],
        ]);

        // Normalizar fechas como día completo (convención [inicio, fin))
        $inicio = Carbon::parse($data['fecha_inicio'])->startOfDay();
        $fin    = Carbon::parse($data['fecha_fin'])->startOfDay();

        // 2) Modelo y stock operativo (excluye mantenimiento/retirada)
        $modelo = Modelo::findOrFail($data['modelo_id']);
        $stockOperativas = $modelo->motos()
            ->whereNotIn('estado', ['mantenimiento', 'retirada'])
            ->count();

        if ($stockOperativas <= 0) {
            return response()->json([
                'message' => 'No hay unidades operativas de este modelo.'
            ], 422);
        }

        // 3) ¿Hay disponibilidad en el rango? (cuenta reservas solapadas)
        // Estados que bloquean inventario:
        $bloqueantes = [
            Reserva::ESTADO_PAID,
            Reserva::ESTADO_ASSIGNED,
            // compatibilidad con estados legados:
            'pendiente','confirmada','recogida',
        ];

        $reservasSolapadas = Reserva::query()
            ->where('modelo_id', $modelo->id)
            ->whereIn('estado', $bloqueantes)
            ->whereDate('fecha_inicio', '<', $fin)
            ->whereDate('fecha_fin',    '>', $inicio)
            ->count();

        if ($reservasSolapadas >= $stockOperativas) {
            return response()->json([
                'message' => 'No hay disponibilidad para las fechas seleccionadas.'
            ], 422);
        }

        // 4) Crear reserva en HOLD
        $data['fecha_inicio'] = $inicio->toDateString();
        $data['fecha_fin']    = $fin->toDateString();
        $data['estado']       = Reserva::ESTADO_HOLD;

        // ✅ cálculo básico de precio (fin es exclusivo)
        $dias = $inicio->diffInDays($fin);
        if ($dias <= 0) {
            return response()->json(['message' => 'Rango de fechas inválido.'], 422);
        }

        // precio por día desde el modelo (fallback 0)
        $precioDia = (float) ($modelo->precio_base ?? 0);
        $subtotal  = $dias * $precioDia;

        // valores por defecto si no vienen del request
        $data['precio_total'] = array_key_exists('precio_total', $data) && $data['precio_total'] !== null
            ? (float) $data['precio_total']
            : $subtotal;

        $data['deposito'] = array_key_exists('deposito', $data) && $data['deposito'] !== null
            ? (float) $data['deposito']
            : (float) ($modelo->deposito_sugerido ?? 0);

        $data['moneda'] = $data['moneda'] ?? 'EUR';

        // ahora sí, crear
        $reserva = Reserva::create($data)->load(['modelo', 'moto']);

        $reserva = Reserva::create($data)->load(['modelo', 'moto']);

        // === Email de confirmación al cliente ===
        try {
            // URL de seguimiento (usaremos el código; más adelante haremos el endpoint/página)
            $frontend = config('app.frontend_url') ?? env('FRONTEND_URL') ?? config('app.url');
            $trackUrl = rtrim((string)$frontend, '/').'/reserva/seguimiento?code='.$reserva->codigo;

            $txt = [];
            $txt[] = "¡Gracias por tu solicitud de reserva!";
            $txt[] = "";
            $txt[] = "Código de reserva: {$reserva->codigo}";
            $txt[] = "Modelo: {$modelo->marca} {$modelo->nombre}";
            $txt[] = "Fechas: {$reserva->fecha_inicio} → {$reserva->fecha_fin} (el día de devolución no se cobra)";
            if (!empty($reserva->precio_total)) {
                $txt[] = "Importe estimado: {$reserva->precio_total} ".($reserva->moneda ?: 'EUR');
            }
            if (!empty($reserva->deposito)) {
                $txt[] = "Depósito estimado: {$reserva->deposito} ".($reserva->moneda ?: 'EUR');
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
            // no romper el flujo si el correo falla
            // log($e->getMessage());
        }

        // 5) Email sencillo al admin (configura tu correo en .env MAIL_* y un destino ADMIN_EMAIL)
        try {
            $admin = config('mail.admin_address') ?? env('ADMIN_EMAIL');
            if ($admin) {
                $lines = [
                    "Nueva solicitud de reserva (HOLD)",
                    "Código: {$reserva->codigo}",
                    "Modelo: {$modelo->marca} {$modelo->nombre} (ID {$modelo->id})",
                    "Fechas: {$reserva->fecha_inicio} → {$reserva->fecha_fin} (fin exclusivo)",
                    "Cliente: {$reserva->cliente_nombre} | {$reserva->cliente_email}" . ($reserva->cliente_tel ? " | {$reserva->cliente_tel}" : ""),
                ];
                if (!empty($reserva->notas)) {
                    $lines[] = "Notas: {$reserva->notas}";
                }
                $body = implode("\n", $lines);

                Mail::raw($body, function ($m) use ($admin) {
                    $m->to($admin)->subject('Nueva reserva (HOLD)');
                });
            }
        } catch (\Throwable $e) {
            // No interrumpir el flujo si el correo falla
            // log($e->getMessage());
        }

        return response()->json($reserva, 201);
    }


    // PATCH /api/reservas/{reserva}
    public function update(Request $req, Reserva $reserva)
    {
        $data = $req->validate([
            'estado'            => ['sometimes', 'in:hold,paid,assigned,canceled,expired'],
            'moto_id'           => ['nullable', 'exists:motos,id'],
            'payment_intent_id' => ['nullable', 'string', 'max:255'],
            'payment_status'    => ['nullable', 'string', 'max:255'],
            'notas'             => ['nullable', 'string'],
        ]);

        $reserva->fill($data)->save();

        return response()->json($reserva->load(['modelo', 'moto']));
    }

    // DELETE /api/reservas/{reserva}
    public function destroy(Reserva $reserva)
    {
        $reserva->delete();
        return response()->noContent();
    }


    //metodos adicionales

    public function lookup(string $codigo)
{
    $codigo = strtoupper(trim($codigo));

    $r = \App\Models\Reserva::query()
        ->with(['modelo:id,slug,marca,nombre'])
        ->where('codigo', $codigo)
        ->firstOrFail();

    // Reglas básicas para permitir cancelación desde el front:
    // (puedes ampliarlas luego: por ejemplo permitir 'paid' si no ha empezado)
    $cancelableEstados = [
        \App\Models\Reserva::ESTADO_HOLD,
        // 'paid', // <-- descomenta si quieres permitir cancelación en paid
    ];
    $hoy = now()->startOfDay();
    $aunNoEmpieza = $r->fecha_inicio->startOfDay()->greaterThan($hoy);
    $puedeCancelar = in_array($r->estado, $cancelableEstados, true) && $aunNoEmpieza;

    return response()->json([
        'id'            => $r->id,
        'codigo'        => $r->codigo,
        'estado'        => $r->estado,
        'fecha_inicio'  => $r->fecha_inicio->toDateString(),
        'fecha_fin'     => $r->fecha_fin->toDateString(), // fin exclusivo
        'precio_total'  => $r->precio_total,
        'deposito'      => $r->deposito,
        'moneda'        => $r->moneda ?: 'EUR',

        'modelo' => [
            'id'     => $r->modelo->id,
            'slug'   => $r->modelo->slug,
            'marca'  => $r->modelo->marca,
            'nombre' => $r->modelo->nombre,
        ],

        'puede_cancelar' => $puedeCancelar,
    ]);
}

public function cancelByCode(Request $request, string $codigo)
{
    $codigo = strtoupper(trim($codigo));

    $r = \App\Models\Reserva::query()
        ->with(['modelo:id,slug,marca,nombre'])
        ->where('codigo', $codigo)
        ->firstOrFail();

    // Reglas de cancelación (ajústalas a gusto):
    // - Permitimos cancelar SOLO si está en HOLD
    // - Y si aún no ha empezado (hoy < fecha_inicio)
    $hoy = now()->startOfDay();
    $aunNoEmpieza = $r->fecha_inicio->startOfDay()->greaterThan($hoy);

    if ($r->estado !== \App\Models\Reserva::ESTADO_HOLD || !$aunNoEmpieza) {
        return response()->json([
            'message' => 'Esta reserva no puede cancelarse (consulta condiciones).'
        ], 422);
    }

    $r->estado = \App\Models\Reserva::ESTADO_CANCELED;
    $r->save();

    // Notificaciones por email (admin y cliente)
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
            \Mail::raw($bodyAdmin, function ($m) use ($admin) {
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
        \Mail::raw($bodyCli, function ($m) use ($r) {
            $m->to($r->cliente_email, $r->cliente_nombre)
              ->subject('Confirmación de cancelación de reserva')
              ->replyTo(config('mail.from.address'), config('mail.from.name'));
        });
    } catch (\Throwable $e) {
        // opcional: \Log::warning('Email cancelación falló: '.$e->getMessage());
    }

    return response()->json([
        'codigo'        => $r->codigo,
        'estado'        => $r->estado,
        'fecha_inicio'  => $r->fecha_inicio->toDateString(),
        'fecha_fin'     => $r->fecha_fin->toDateString(),
        'modelo'        => [
            'id' => $r->modelo->id, 'slug' => $r->modelo->slug,
            'marca' => $r->modelo->marca, 'nombre' => $r->modelo->nombre
        ]
    ]);
}
}