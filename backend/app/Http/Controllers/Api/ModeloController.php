<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Modelo;
use App\Models\Moto;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Models\Reserva;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Storage;
class ModeloController extends Controller
{
    // GET /api/modelos
    public function index(Request $request)
    {
        $q = Modelo::query();

        if ($s = $request->get('search')) {
            $q->where(function ($w) use ($s) {
                $w->where('marca','like',"%$s%")
                  ->orWhere('nombre','like',"%$s%")
                  ->orWhere('slug','like',"%$s%");
            });
        }

        // orden simple
        $q->orderByDesc('id');

        // per_page=all para traer todo
        $pp = $request->get('per_page');
        if ($pp === 'all') {
            return response()->json($q->get());
        }
        $perPage = max(1, min((int)($pp ?? 20), 100));

        return response()->json($q->paginate($perPage));
    }

    // GET /api/modelos/{slug}
    public function show(string $slug)
    {
        $modelo = Modelo::where('slug', $slug)->firstOrFail();
        return response()->json($modelo);
    }

    // POST /api/modelos
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

    // PUT /api/modelos/{id}
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

    // DELETE /api/modelos/{id}
    public function destroy(int $id)
    {
        $modelo = Modelo::findOrFail($id);

        // Evitar borrar si hay motos que lo usan (opcional pero recomendable)
        $enUso = Moto::where('modelo_id', $id)->exists();
        if ($enUso) {
            return response()->json([
                'message' => 'No se puede eliminar: hay motos asociadas a este modelo.'
            ], 422);
        }

        $modelo->delete();
        return response()->json(['deleted' => true]);
    }


     public function availability(Request $request, string $slug)
{
    // 1) Validar entrada
    $request->validate([
        'from' => ['required','date'],
        'to'   => ['required','date','after:from'], // exclusivo
    ]);

    // 2) Resolver modelo por slug
    $modelo = Modelo::where('slug', $slug)->firstOrFail();

    // 3) Rango [from, to) en días enteros
    $from = Carbon::parse($request->get('from'))->startOfDay();
    $to   = Carbon::parse($request->get('to'))->startOfDay(); // exclusivo

    // 4) Stock operativo (excluye motos no alquilables)
    $stockOperativas = $modelo->motos()
        ->whereNotIn('estado', ['mantenimiento', 'retirada'])
        ->count();

    // 5) Estados que bloquean inventario
    $bloqueantes = [
        Reserva::ESTADO_PAID,
        Reserva::ESTADO_ASSIGNED,
        // legados por compatibilidad:
        'pendiente','confirmada','recogida',
    ];

    // 6) Traer reservas que se solapan con el rango
    $reservas = Reserva::query()
        ->where('modelo_id', $modelo->id)
        ->whereIn('estado', $bloqueantes)
        ->whereDate('fecha_inicio', '<', $to)
        ->whereDate('fecha_fin',    '>', $from)
        ->get(['fecha_inicio','fecha_fin']);

    // 7) Inicializar mapa de días
    /** @var array<string, array{booked:int, available:int, is_available:bool}> $days */
    $days = [];
    foreach (CarbonPeriod::create($from, $to->copy()->subDay()) as $day) {
        $iso = $day->toDateString();
        $days[$iso] = ['booked' => 0, 'available' => $stockOperativas, 'is_available' => $stockOperativas > 0];
    }

    // 8) Contabilizar reservas por día (regla [inicio, fin): el día de devolución no bloquea)
    foreach ($reservas as $r) {
        $ini = $r->fecha_inicio->copy()->startOfDay();
        $fin = $r->fecha_fin->copy()->startOfDay();

        $start = $ini->greaterThan($from) ? $ini : $from;
        $end   = $fin->lessThan($to) ? $fin : $to;

        foreach (CarbonPeriod::create($start, $end->copy()->subDay()) as $d) {
            $iso = $d->toDateString();
            if (!isset($days[$iso])) continue;
            $days[$iso]['booked'] += 1;
        }
    }

    // 9) Calcular disponibles y flag de disponibilidad
    foreach ($days as $iso => $info) {
        $avail = max(0, $stockOperativas - $info['booked']);
        $days[$iso]['available']    = $avail;
        $days[$iso]['is_available'] = $avail > 0;
    }

    return response()->json([
        'modelo' => [
            'id'    => $modelo->id,
            'slug'  => $modelo->slug,
            'marca' => $modelo->marca,
            'nombre'=> $modelo->nombre,
        ],
        'period' => [
            'from' => $from->toDateString(),
            'to'   => $to->toDateString(), // exclusivo
        ],
        'stock' => [
            'operativas' => $stockOperativas,
        ],
        'days' => $days, // ⬅️ exactamente el shape que consume tu componente
    ]);
}

      public function quote(Request $req, Modelo $modelo)
    {
        $data = $req->validate([
            'fecha_inicio' => ['required', 'date'],
            'fecha_fin'    => ['required', 'date', 'after:fecha_inicio'],
        ]);

        $start = Carbon::parse($data['fecha_inicio'])->startOfDay();
        $end   = Carbon::parse($data['fecha_fin'])->startOfDay(); // exclusivo
        $days  = $start->diffInDays($end);

        if ($days <= 0) {
            return response()->json(['message' => 'El rango debe cubrir al menos 1 día.'], 422);
        }

        // Precio base (asumo columnas: precio_base y deposito_sugerido en modelos)
        $precioDia = (float)$modelo->precio_base;
        $deposito  = (float)($modelo->deposito_sugerido ?? 0.0);
        $subtotal  = round($precioDia * $days, 2);
        $total     = $subtotal; // impuestos/extras los añadimos más adelante

        // Chequeo de disponibilidad para TODO el rango
        $stock = $modelo->motos()->count();
        $blockStates = [Reserva::ESTADO_PAID, Reserva::ESTADO_ASSIGNED];

        $reservas = Reserva::query()
            ->where('modelo_id', $modelo->id)
            ->whereIn('estado', $blockStates)
            ->where('fecha_inicio', '<', $end->toDateString())
            ->where('fecha_fin',    '>', $start->toDateString())
            ->get(['fecha_inicio', 'fecha_fin']);

        // cuenta reservas por día
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
            'moneda'        => 'EUR', // ajusta si guardas otra cosa
            'disponible'    => $isAvailable,
        ]);
    }

public function catalog(\Illuminate\Http\Request $req)
{
    $limit = min((int) $req->query('limit', 24), 48);

    // Selección tolerante por si no existen columnas opcionales
    $select = ['id','marca','nombre','slug','categoria','precio_base','deposito_sugerido','imagenes'];
    if (\Illuminate\Support\Facades\Schema::hasColumn('modelos','specs'))  { $select[] = 'specs'; }
    if (\Illuminate\Support\Facades\Schema::hasColumn('modelos','badges')) { $select[] = 'badges'; }

    $items = \App\Models\Modelo::query()
        ->with(['motos' => function ($q) {
            $q->select('id','modelo_id','imagenes','specs','badges','precio_dia','estado','deleted_at')
              ->whereNull('deleted_at')
              ->limit(1);
        }])
        ->orderByDesc('id')
        ->take($limit)
        ->get($select);

    $out = $items->map(function ($m) {
        // Normalizador (array | json-string -> array)
        $normalize = function ($v) {
            if (is_array($v)) return $v;
            if (is_string($v)) {
                $arr = json_decode($v, true);
                return is_array($arr) ? $arr : [];
            }
            return [];
        };

        $firstMoto = $m->motos->first();

        // ---- Imagen: primero del modelo, si no, de 1 moto
        $imgsModelo = $normalize($m->imagenes ?? []);
        $img = $imgsModelo[0] ?? null;
        if (!$img && $firstMoto) {
            $imgsMoto = $normalize($firstMoto->imagenes ?? []);
            $img = $imgsMoto[0] ?? null;
        }
        if ($img && !str_starts_with($img, 'http') && !str_starts_with($img, '/')) {
            $img = \Illuminate\Support\Facades\Storage::disk('public')->url($img);
        }

        // ---- Specs / badges: del modelo o fallback a 1 moto
        $specs  = $normalize($m->specs  ?? []);
        $badges = $normalize($m->badges ?? []);
        if (empty($specs)  && $firstMoto) $specs  = $normalize($firstMoto->specs  ?? []);
        if (empty($badges) && $firstMoto) $badges = $normalize($firstMoto->badges ?? []);

        // ---- Precio: del modelo o de la moto
        $price = (float)($m->precio_base ?? 0);
        if (!$price && $firstMoto?->precio_dia) $price = (float)$firstMoto->precio_dia;

        // ---- Stock disponible HOY
        $activeCount = \App\Models\Moto::query()
            ->where('modelo_id', $m->id)
            ->whereNotIn('estado', ['reservada','mantenimiento','baja','inactiva'])
            ->count();

        $blockStates = [
            \App\Models\Reserva::ESTADO_PAID,
            \App\Models\Reserva::ESTADO_ASSIGNED,
            // compatibilidad con estados antiguos si aún existen
            'pendiente','confirmada','recogida',
        ];

        $today = \Carbon\Carbon::today()->toDateString();
        $ocupadasHoy = \App\Models\Reserva::query()
            ->where('modelo_id', $m->id)
            ->whereIn('estado', $blockStates)
            ->where('fecha_inicio', '<=', $today)
            ->where('fecha_fin',    '>',  $today)
            ->count();

        $stockHoy = max(0, $activeCount - $ocupadasHoy);
        $inStock  = $stockHoy > 0;

        return [
            'id'          => (int)$m->id,
            'name'        => trim(($m->marca ? $m->marca.' ' : '').($m->nombre ?? '')),
            'slug'        => (string)$m->slug,
            'img'         => $img,                                  // puede ser null
            'tag'         => (string)($m->categoria ?? $m->marca ?? ''),
            'price'       => $price,
            'badges'      => array_values($badges),
            'specs'       => is_array($specs) ? $specs : [],
            'stock_total' => $activeCount,
            'stock_hoy'   => $stockHoy,
            'in_stock'    => $inStock,
        ];
    })->values();

    return response()->json($out);
}

}