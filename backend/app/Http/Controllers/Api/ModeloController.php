<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Modelo;
use App\Models\Moto;
use App\Models\Reserva;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

class ModeloController extends Controller
{
    /**
     * GET /api/modelos
     * Listado para admin (búsqueda + paginación)
     */
    public function index(Request $request)
    {
        $q = Modelo::query();

        if ($s = $request->string('search')->trim()) {
            $q->where(function ($w) use ($s) {
                $w->where('marca',  'like', "%{$s}%")
                  ->orWhere('nombre','like', "%{$s}%")
                  ->orWhere('slug',  'like', "%{$s}%")
                  ->orWhere('categoria','like', "%{$s}%");
            });
        }

        $q->orderByDesc('id');

        $pp = $request->get('per_page');
        if ($pp === 'all') {
            return response()->json($q->get());
        }

        $perPage = max(1, min((int)($pp ?? 20), 100));
        return response()->json($q->paginate($perPage));
    }

    /**
     * GET /api/modelos/admin-list
     * Listado para admin con contadores de motos
     * - motos_total
     * - motos_disponibles (estado = 'disponible')
     */
    public function adminList(Request $request)
    {
        $q = Modelo::query()
            ->withCount([
                'motos as motos_total',
                'motos as motos_disponibles' => function ($qq) {
                    $qq->where('estado', 'disponible');
                },
            ]);

        if ($s = $request->string('search')->trim()) {
            $q->where(function ($w) use ($s) {
                $w->where('marca',  'like', "%{$s}%")
                  ->orWhere('nombre','like', "%{$s}%")
                  ->orWhere('slug',  'like', "%{$s}%")
                  ->orWhere('categoria','like', "%{$s}%");
            });
        }

        $q->orderByDesc('id');

        $pp = $request->query('per_page');
        if ($pp === 'all') {
            return response()->json(['data' => $q->get()]);
        }

        $perPage = max(1, min((int)($pp ?? 20), 100));
        return $q->paginate($perPage);
    }

    /**
     * GET /api/modelos/{slug}
     * Detalle de un modelo (para front)
     */
    public function show(string $slug)
    {
        $modelo = Modelo::where('slug', $slug)->firstOrFail();
        return response()->json($modelo);
    }

    /**
     * POST /api/modelos
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'slug'              => ['required','string','max:120','unique:modelos,slug'],
            'marca'             => ['required','string','max:120'],
            'nombre'            => ['required','string','max:120'],
            'categoria'         => ['required','in:scooter,125cc,250cc,moto'],
            'precio_base'       => ['required','numeric','min:0'],
            'deposito_sugerido' => ['nullable','numeric','min:0'],
            'descripcion'       => ['nullable','string'],
            'imagenes'          => ['nullable','array'],
            'imagenes.*'        => ['string','max:255'],
            'specs'             => ['nullable','array'],
            'badges'            => ['nullable','array'],
        ]);

        $modelo = Modelo::create($data);
        return response()->json($modelo, 201);
    }

    /**
     * PUT /api/modelos/{id}
     */
    public function update(Request $request, int $id)
    {
        $modelo = Modelo::findOrFail($id);

        $data = $request->validate([
            'slug'              => ['sometimes','string','max:120', Rule::unique('modelos','slug')->ignore($modelo->id)],
            'marca'             => ['sometimes','string','max:120'],
            'nombre'            => ['sometimes','string','max:120'],
            'categoria'         => ['sometimes','in:scooter,125cc,250cc,moto'],
            'precio_base'       => ['sometimes','numeric','min:0'],
            'deposito_sugerido' => ['sometimes','nullable','numeric','min:0'],
            'descripcion'       => ['sometimes','nullable','string'],
            'imagenes'          => ['sometimes','nullable','array'],
            'imagenes.*'        => ['string','max:255'],
            'specs'             => ['sometimes','nullable','array'],
            'badges'            => ['sometimes','nullable','array'],
        ]);

        $modelo->update($data);
        return response()->json($modelo);
    }

    /**
     * DELETE /api/modelos/{id}
     */
    public function destroy(int $id)
    {
        $modelo = Modelo::findOrFail($id);

        $tieneMotos = Moto::withTrashed()->where('modelo_id', $id)->exists();
        if ($tieneMotos) {
            return response()->json([
                'message' => 'No se puede eliminar: hay motos asociadas a este modelo.'
            ], 422);
        }

        $tieneReservas = Reserva::where('modelo_id', $id)->exists();
        if ($tieneReservas) {
            return response()->json([
                'message' => 'No se puede eliminar: este modelo tiene reservas asociadas.'
            ], 422);
        }

        $modelo->forceDelete();
        return response()->json(['deleted' => true]);
    }

    /**
     * GET /api/modelos/{slug}/availability?from=YYYY-MM-DD&to=YYYY-MM-DD
     * Calendario por MODELO (stock agregado).
     * Bloquea por reservas en estados: paid / assigned (+ legados).
     * Regla de rango: [inicio, fin) (el día de devolución no bloquea).
     */
    public function availability(Request $request, string $slug)
    {
        $request->validate([
            'from' => ['required','date'],
            'to'   => ['required','date','after:from'], // exclusivo
        ]);

        $modelo = Modelo::where('slug', $slug)->firstOrFail();

        $from = Carbon::parse($request->get('from'))->startOfDay();
        $to   = Carbon::parse($request->get('to'))->startOfDay(); // exclusivo

        // Motos operativas (no alquilables se excluyen)
        $stockOperativas = $modelo->motos()
            ->whereNotIn('estado', ['mantenimiento','retirada','baja','inactiva'])
            ->count();

        $bloqueantes = [
            Reserva::ESTADO_PAID,
            Reserva::ESTADO_ASSIGNED,
            // compat legada:
            'pendiente','confirmada','recogida',
        ];

        // Reservas solapadas con el rango
        $reservas = Reserva::query()
            ->where('modelo_id', $modelo->id)
            ->whereIn('estado', $bloqueantes)
            ->whereDate('fecha_inicio', '<', $to)
            ->whereDate('fecha_fin',    '>', $from)
            ->get(['fecha_inicio','fecha_fin']);

        // Mapa de días
        $days = [];
        foreach (CarbonPeriod::create($from, $to->copy()->subDay()) as $day) {
            $iso = $day->toDateString();
            $days[$iso] = [
                'booked'       => 0,
                'available'    => $stockOperativas,
                'is_available' => $stockOperativas > 0,
            ];
        }

        // Incrementar ocupación por día (regla [inicio, fin))
        foreach ($reservas as $r) {
            $ini = Carbon::parse($r->fecha_inicio)->startOfDay();
            $fin = Carbon::parse($r->fecha_fin)->startOfDay();

            $start = $ini->greaterThan($from) ? $ini : $from;
            $end   = $fin->lessThan($to) ? $fin : $to;

            foreach (CarbonPeriod::create($start, $end->copy()->subDay()) as $d) {
                $iso = $d->toDateString();
                if (!isset($days[$iso])) continue;
                $days[$iso]['booked'] += 1;
            }
        }

        // Calcular disponibles
        foreach ($days as $iso => $info) {
            $avail = max(0, $stockOperativas - $info['booked']);
            $days[$iso]['available']    = $avail;
            $days[$iso]['is_available'] = $avail > 0;
        }

        return response()->json([
            'modelo' => [
                'id'     => $modelo->id,
                'slug'   => $modelo->slug,
                'marca'  => $modelo->marca,
                'nombre' => $modelo->nombre,
            ],
            'period' => [
                'from' => $from->toDateString(),
                'to'   => $to->toDateString(), // exclusivo
            ],
            'stock' => [
                'operativas' => $stockOperativas,
            ],
            'days' => $days,
        ]);
    }

    /**
     * POST /api/modelos/{modelo}/quote
     * Presupuesto rápido por rango con chequeo de disponibilidad agregada.
     */
    public function quote(Request $req, Modelo $modelo)
    {
        $data = $req->validate([
            'fecha_inicio' => ['required','date'],
            'fecha_fin'    => ['required','date','after:fecha_inicio'],
        ]);

        $start = Carbon::parse($data['fecha_inicio'])->startOfDay();
        $end   = Carbon::parse($data['fecha_fin'])->startOfDay(); // exclusivo
        $days  = $start->diffInDays($end);

        if ($days <= 0) {
            return response()->json(['message' => 'El rango debe cubrir al menos 1 día.'], 422);
        }

        $precioDia = (float) ($modelo->precio_base ?? 0);
        $deposito  = (float) ($modelo->deposito_sugerido ?? 0);
        $subtotal  = round($precioDia * $days, 2);
        $total     = $subtotal;

        // Disponibilidad del rango (agregada, por modelo)
        $stock = $modelo->motos()
            ->whereNotIn('estado', ['mantenimiento','retirada','baja','inactiva'])
            ->count();

        $blockStates = [Reserva::ESTADO_PAID, Reserva::ESTADO_ASSIGNED, 'pendiente','confirmada','recogida'];

        $reservas = Reserva::query()
            ->where('modelo_id', $modelo->id)
            ->whereIn('estado', $blockStates)
            ->whereDate('fecha_inicio', '<', $end->toDateString())
            ->whereDate('fecha_fin',    '>', $start->toDateString())
            ->get(['fecha_inicio','fecha_fin']);

        $bookedPerDay = [];
        foreach ($reservas as $r) {
            $s = Carbon::parse($r->fecha_inicio)->startOfDay();
            $e = Carbon::parse($r->fecha_fin)->startOfDay();
            if ($s->lt($start)) $s = $start->copy();
            if ($e->gt($end))   $e = $end->copy();

            foreach (CarbonPeriod::create($s, '1 day', $e->copy()->subDay()) as $d) {
                $k = $d->toDateString();
                $bookedPerDay[$k] = ($bookedPerDay[$k] ?? 0) + 1;
            }
        }

        $isAvailable = true;
        foreach (CarbonPeriod::create($start, '1 day', $end->copy()->subDay()) as $d) {
            $k = $d->toDateString();
            $booked = (int)($bookedPerDay[$k] ?? 0);
            if ($stock - $booked <= 0) { $isAvailable = false; break; }
        }

        return response()->json([
            'modelo_id'     => $modelo->id,
            'fecha_inicio'  => $start->toDateString(),
            'fecha_fin'     => $end->toDateString(),   // exclusivo
            'dias'          => $days,
            'precio_dia'    => $precioDia,
            'subtotal'      => $subtotal,
            'deposito'      => $deposito,
            'total'         => $total,
            'moneda'        => 'EUR',
            'disponible'    => $isAvailable,
        ]);
    }

    /**
     * GET /api/catalog/modelos?limit=6
     * Catálogo para home (imagen, specs/badges, price, stock_hoy)
     */
    public function catalog(Request $req)
    {
        $limit = min((int) $req->query('limit', 24), 48);
        $today = Carbon::today()->toDateString();
        $blockStates = [Reserva::ESTADO_PAID, Reserva::ESTADO_ASSIGNED, 'pendiente','confirmada','recogida','reservada'];

        $select = ['id','marca','nombre','slug','categoria','precio_base','deposito_sugerido','imagenes'];
        if (Schema::hasColumn('modelos','specs'))  { $select[] = 'specs'; }
        if (Schema::hasColumn('modelos','badges')) { $select[] = 'badges'; }

        $items = Modelo::query()
            ->with(['motos' => function ($q) {
                $q->select('id','modelo_id','imagenes','specs','badges','precio_dia','estado','deleted_at')
                  ->whereNull('deleted_at')
                  ->limit(1);
            }])
            ->orderByDesc('id')
            ->take($limit)
            ->get($select);

        $modeloIds = $items->pluck('id')->all();

        $activeCounts = Moto::query()
            ->selectRaw('modelo_id, COUNT(*) as total')
            ->whereIn('modelo_id', $modeloIds)
            ->whereNotIn('estado', ['reservada','mantenimiento','baja','inactiva'])
            ->groupBy('modelo_id')
            ->pluck('total', 'modelo_id');

        $occupiedCounts = Reserva::query()
            ->selectRaw('modelo_id, COUNT(*) as total')
            ->whereIn('modelo_id', $modeloIds)
            ->whereIn('estado', $blockStates)
            ->where('fecha_inicio', '<=', $today)
            ->where('fecha_fin', '>', $today)
            ->groupBy('modelo_id')
            ->pluck('total', 'modelo_id');

        $out = $items->map(function ($m) use ($activeCounts, $occupiedCounts) {
            // normalizador array/json-string
            $normalize = function ($v) {
                if (is_array($v)) return $v;
                if (is_string($v)) {
                    $arr = json_decode($v, true);
                    return is_array($arr) ? $arr : [];
                }
                return [];
            };

            $firstMoto = $m->motos->first();

            // Imagen
            $imgsModelo = $normalize($m->imagenes ?? []);
            $img = $imgsModelo[0] ?? null;
            if (!$img && $firstMoto) {
                $imgsMoto = $normalize($firstMoto->imagenes ?? []);
                $img = $imgsMoto[0] ?? null;
            }
            if ($img && !str_starts_with($img, 'http') && !str_starts_with($img, '/')) {
                $segments = array_map('rawurlencode', explode('/', ltrim($img, '/')));
                $img = url('/api/media/file/' . implode('/', $segments));
            }

            // Specs / badges fallback
            $specs  = $normalize($m->specs  ?? []);
            $badges = $normalize($m->badges ?? []);
            if ($firstMoto) {
                $specs = array_replace(
                    $normalize($firstMoto->specs ?? []),
                    array_filter($specs, fn ($value) => $value !== null && $value !== '')
                );

                if (empty($badges)) {
                    $badges = $normalize($firstMoto->badges ?? []);
                }
            }

            // Precio
            $price = (float)($m->precio_base ?? 0);
            if (!$price && $firstMoto?->precio_dia) $price = (float)$firstMoto->precio_dia;

            // Stock disponible HOY (agregado)
            $activeCount = (int) ($activeCounts[$m->id] ?? 0);
            $ocupadasHoy = (int) ($occupiedCounts[$m->id] ?? 0);

            $stockHoy = max(0, $activeCount - $ocupadasHoy);

            return [
                'id'          => (int)$m->id,
                'name'        => trim(($m->marca ? $m->marca.' ' : '').($m->nombre ?? '')),
                'slug'        => (string)$m->slug,
                'img'         => $img,
                'tag'         => (string)($m->categoria ?? $m->marca ?? ''),
                'price'       => $price,
                'badges'      => array_values($badges),
                'specs'       => is_array($specs) ? $specs : [],
                'stock_total' => $activeCount,
                'stock_hoy'   => $stockHoy,
                'in_stock'    => $stockHoy > 0,
            ];
        })->values();

        return response()->json($out);
    }
}
