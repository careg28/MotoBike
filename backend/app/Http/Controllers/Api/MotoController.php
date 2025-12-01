<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Moto;
use App\Models\Reserva;
use App\Models\Modelo;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Carbon;

class MotoController extends Controller
{
    // GET /api/motos
    public function index(Request $request)
    {
        $q = Moto::query();

        // Papelera
        if ($request->boolean('only_trashed')) {
            $q->onlyTrashed();
        } elseif ($request->boolean('with_trashed')) {
            $q->withTrashed();
        }

        // Filtros
        if ($request->filled('categoria')) $q->where('categoria', $request->categoria);
        if ($request->filled('estado'))    $q->where('estado', $request->estado);
        if ($s = $request->get('search')) {
            $q->where(function ($w) use ($s) {
                $w->where('marca','like',"%$s%")
                  ->orWhere('modelo','like',"%$s%")
                  ->orWhere('slug','like',"%$s%");
            });
        }

        // ¿Ocupadas/libres ahora?
        if ($request->filled('asignada')) {
            $bloq = ['pendiente','confirmada','recogida'];
            if ($request->boolean('asignada')) {
                $q->whereHas('reservas', function ($r) use ($bloq) {
                    $r->whereIn('estado', $bloq)
                      ->where('inicio', '<=', now())
                      ->where('fin',    '>',  now());
                });
            } else {
                $q->whereDoesntHave('reservas', function ($r) use ($bloq) {
                    $r->whereIn('estado', $bloq)
                      ->where('inicio', '<=', now())
                      ->where('fin',    '>',  now());
                })->where('estado', '!=', 'mantenimiento');
            }
        }

        // Libres en rango [inicio, fin)
        if ($request->boolean('libres')) {
            $request->validate([
                'inicio' => ['required','date'],
                'fin'    => ['required','date','after:inicio'],
            ]);
            $bloq = ['pendiente','confirmada','recogida'];
            $idsOcup = Reserva::whereIn('estado', $bloq)
                ->where('inicio', '<', $request->fin)
                ->where('fin',    '>', $request->inicio)
                ->pluck('moto_id');
            $q->whereNotIn('id', $idsOcup)->where('estado','!=','mantenimiento');
        }

        // Orden
        $sort = $request->get('sort');
        if ($sort === 'precio')      $q->orderBy('precio_dia');
        elseif ($sort === '-precio') $q->orderByDesc('precio_dia');
        else                         $q->orderByDesc('id');

        // Paginación
        $pp = $request->get('per_page');
        if ($pp === 'all') {
            return response()->json($q->get());
        }
        $perPage = max(1, min((int)($pp ?? 20), 100));
        return response()->json($q->paginate($perPage));
    }

    // GET /api/motos/{slug}/precio?inicio=...&fin=...&extras=&iva=
    public function price(Request $request, string $slug)
    {
        $request->validate([
            'inicio' => ['required','date'],
            'fin'    => ['required','date','after:inicio'],
            'extras' => ['nullable','numeric','min:0'],
            'iva'    => ['nullable','boolean'],
        ]);

        $moto   = Moto::where('slug', $slug)->firstOrFail();
        $inicio = Carbon::parse($request->inicio);
        $fin    = Carbon::parse($request->fin);

        $horas = $inicio->floatDiffInHours($fin);
        $dias  = max(1, (int) ceil($horas / 24));

        $precioDia   = (float) $moto->precio_dia;
        $extras      = (float) ($request->extras ?? 0);
        $subtotal    = $dias * $precioDia + $extras;

        $ivaRate     = 0.21;
        $conIva      = $request->boolean('iva', true);
        $ivaImporte  = $conIva ? round($subtotal * $ivaRate, 2) : 0.0;

        $deposito    = (float) ($moto->deposito ?? 0);
        $total       = round($subtotal + $ivaImporte, 2);

        return response()->json([
            'moto' => [
                'id' => $moto->id,
                'slug' => $moto->slug,
                'precio_dia' => (float) $moto->precio_dia,
                'deposito' => $deposito,
            ],
            'rango' => [
                'inicio' => $inicio->toDateTimeString(),
                'fin'    => $fin->toDateTimeString(),
                'dias'   => $dias,
                'horas'  => $horas,
            ],
            'precio' => [
                'extras'   => $extras,
                'subtotal' => round($subtotal, 2),
                'iva'      => $ivaImporte,
                'total'    => $total,
                'deposito' => $deposito,
                'a_pagar'  => round($total + $deposito, 2),
            ],
        ]);
    }

    // GET /api/motos/{slug}
    public function show(string $slug)
    {
        $moto = Moto::where('slug', $slug)->firstOrFail();
        return response()->json($moto);
    }

    // POST /api/motos
    public function store(Request $request)
    {
        // 1) Validar
        $data = $request->validate([
            'modelo_id'   => ['nullable','exists:modelos,id'],

            'slug'        => ['required','string','max:120',
                Rule::unique('motos','slug')->whereNull('deleted_at')
            ],

            'marca'       => ['required_without:modelo_id','string','max:120'],
            'modelo'      => ['required_without:modelo_id','string','max:120'],

            'anio'        => ['nullable','integer','min:1990','max:2100'],
            'matricula'   => ['required','string','max:50',
                Rule::unique('motos','matricula')->whereNull('deleted_at')
            ],
            'vin'         => ['nullable','string','max:50',
                Rule::unique('motos','vin')->whereNull('deleted_at')
            ],
            'color'       => ['nullable','string','max:80'],
            'categoria'   => ['required','in:scooter,125cc,250cc,moto'],
            'estado'      => ['nullable','in:disponible,reservada,mantenimiento,retirada'],
            'precio_dia'  => ['required','numeric','min:0'],
            'deposito'    => ['nullable','numeric','min:0'],
            'kilometraje' => ['nullable','integer','min:0'],
            'ubicacion'   => ['nullable','string','max:120'],

            'imagenes'    => ['nullable','array'],
            'imagenes.*'  => ['string','max:255'],
            'tag'         => ['nullable','string','max:120'],
            'specs'       => ['nullable','array'],
            'badges'      => ['nullable','array'],
            'notas'       => ['nullable','string'],
        ]);

        // 2) Defaults desde modelo
        if (!empty($data['modelo_id'])) {
            if ($mod = Modelo::find($data['modelo_id'])) {
                $data['marca']      = $data['marca']      ?? $mod->marca;
                $data['modelo']     = $data['modelo']     ?? $mod->nombre;
                $data['categoria']  = $data['categoria']  ?? $mod->categoria;
                $data['precio_dia'] = $data['precio_dia'] ?? (float) $mod->precio_base;
                $data['deposito']   = array_key_exists('deposito', $data)
                                      ? $data['deposito']
                                      : ($mod->deposito_sugerido ?? null);
                $data['imagenes']   = $data['imagenes']   ?? ($mod->imagenes ?? null);
                $data['specs']      = $data['specs']      ?? ($mod->specs ?? null);
                $data['badges']     = $data['badges']     ?? ($mod->badges ?? null);
            }
        }

        // 3) Normalizar
        $data['estado']    = $data['estado']    ?? 'disponible';
        $data['matricula'] = strtoupper($data['matricula']);
        if (isset($data['vin'])) $data['vin'] = strtoupper($data['vin']);

        // 4) Crear
        $moto = Moto::create($data);
        return response()->json($moto->load('modelo'), 201);
    }

    // PUT /api/motos/{id}
    public function update(Request $request, int $id)
    {
        $moto = Moto::findOrFail($id);

        $data = $request->validate([
            'modelo_id'   => ['sometimes','nullable','exists:modelos,id'],

            'slug'        => ['sometimes','string','max:120',
                Rule::unique('motos','slug')->ignore($moto->id)->whereNull('deleted_at')
            ],

            'marca'       => ['sometimes','required_without:modelo_id','string','max:120'],
            'modelo'      => ['sometimes','required_without:modelo_id','string','max:120'],

            'anio'        => ['sometimes','nullable','integer','min:1990','max:2100'],
            'matricula'   => ['sometimes','string','max:50',
                Rule::unique('motos','matricula')->ignore($moto->id)->whereNull('deleted_at')
            ],
            'vin'         => ['sometimes','nullable','string','max:50',
                Rule::unique('motos','vin')->ignore($moto->id)->whereNull('deleted_at')
            ],
            'color'       => ['sometimes','nullable','string','max:80'],
            'categoria'   => ['sometimes','in:scooter,125cc,250cc,moto'],
            'estado'      => ['sometimes','in:disponible,reservada,mantenimiento,retirada'],
            'precio_dia'  => ['sometimes','numeric','min:0'],
            'deposito'    => ['sometimes','nullable','numeric','min:0'],
            'kilometraje' => ['sometimes','integer','min:0'],
            'ubicacion'   => ['sometimes','nullable','string','max:120'],

            'imagenes'    => ['sometimes','nullable','array'],
            'imagenes.*'  => ['string','max:255'],
            'tag'         => ['sometimes','nullable','string','max:120'],
            'specs'       => ['sometimes','nullable','array'],
            'badges'      => ['sometimes','nullable','array'],
            'notas'       => ['sometimes','nullable','string'],
        ]);

        // Normalizar vacíos a null
        foreach (['vin','color','ubicacion','tag','notas'] as $k) {
            if (array_key_exists($k, $data) && $data[$k] === '') $data[$k] = null;
        }
        if (array_key_exists('matricula', $data)) $data['matricula'] = strtoupper($data['matricula']);
        if (array_key_exists('vin', $data) && $data['vin']) $data['vin'] = strtoupper($data['vin']);

        // Completar con defaults del modelo si corresponde
        if (array_key_exists('modelo_id', $data) && !empty($data['modelo_id'])) {
            if ($mod = Modelo::find($data['modelo_id'])) {
                $data['marca']      = $data['marca']      ?? $moto->marca      ?? $mod->marca;
                $data['modelo']     = $data['modelo']     ?? $moto->modelo     ?? $mod->nombre;
                $data['categoria']  = $data['categoria']  ?? $moto->categoria  ?? $mod->categoria;
                $data['precio_dia'] = $data['precio_dia'] ?? $moto->precio_dia ?? (float) $mod->precio_base;

                if (!array_key_exists('deposito', $data))
                    $data['deposito'] = $moto->deposito ?? $mod->deposito_sugerido;

                if (!array_key_exists('imagenes', $data) && empty($moto->imagenes))
                    $data['imagenes'] = $mod->imagenes ?? null;

                if (!array_key_exists('specs', $data) && empty($moto->specs))
                    $data['specs'] = $mod->specs ?? null;

                if (!array_key_exists('badges', $data) && empty($moto->badges))
                    $data['badges'] = $mod->badges ?? null;
            }
        }

        $moto->update($data);
        return response()->json($moto->load('modelo'));
    }

    // DELETE /api/motos/{id} (soft delete)
    public function destroy(int $id)
    {
        $moto = Moto::findOrFail($id);
        $moto->delete();
        return response()->json(['deleted' => true]);
    }

    // POST /api/motos/{id}/restore
    public function restore(int $id)
    {
        $moto = Moto::onlyTrashed()->findOrFail($id);
        $moto->restore();
        return response()->json($moto);
    }

    // DELETE /api/motos/{id}/force (borrado definitivo)
    public function forceDelete(int $id)
    {
        $moto = Moto::withTrashed()->findOrFail($id);
        $moto->forceDelete();
        return response()->json(['deleted' => true]);
    }
}
