<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Moto extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'slug','marca','modelo','anio','matricula','vin','color',
        'categoria','estado','precio_dia','deposito','kilometraje',
        'ubicacion','imagenes','specs','badges','tag','notas',
        'modelo_id', // <-- añade esto para poder asignarla a un modelo
    ];

    protected $casts = [
        'anio' => 'integer',
        'precio_dia' => 'decimal:2',
        'deposito' => 'decimal:2',
        'kilometraje' => 'integer',
        'imagenes' => 'array',
        'specs' => 'array',
        'badges' => 'array',
    ];

    protected $appends = ['asignada'];

    // Relaciones
    public function reservas() { return $this->hasMany(Reserva::class); }
    public function modelo()   { return $this->belongsTo(Modelo::class); }

    /** Estados que bloquean una MOTO concreta (incluye legados) */
    protected function estadosBloqueantes(): array
    {
        return [
            Reserva::ESTADO_PAID,
            Reserva::ESTADO_ASSIGNED,
            // legados por compatibilidad con código antiguo:
            'pendiente','confirmada','recogida',
        ];
    }

    /** ¿está ocupada AHORA (por una reserva en curso)? */
    public function getAsignadaAttribute(): bool
    {
        $bloqueantes = $this->estadosBloqueantes();

        return $this->reservas()
            ->whereIn('estado', $bloqueantes)
            ->whereDate('fecha_inicio', '<=', now())
            ->whereDate('fecha_fin',    '>',  now())
            ->exists();
    }

    /** Motos libres en rango [inicio, fin) (excluye mantenimiento) */
    public function scopeLibresEntre($query, $inicio, $fin)
    {
        $bloqueantes = $this->estadosBloqueantes();

        return $query
            ->where('estado', '!=', 'mantenimiento')
            ->whereDoesntHave('reservas', function ($r) use ($inicio, $fin, $bloqueantes) {
                $r->whereIn('estado', $bloqueantes)
                  ->whereDate('fecha_inicio', '<',  $fin)
                  ->whereDate('fecha_fin',    '>',  $inicio);
            });
    }

    /** Motos ocupadas AHORA */
    public function scopeOcupadasAhora($query)
    {
        $bloqueantes = $this->estadosBloqueantes();

        return $query->whereHas('reservas', function ($r) use ($bloqueantes) {
            $r->whereIn('estado', $bloqueantes)
              ->whereDate('fecha_inicio', '<=', now())
              ->whereDate('fecha_fin',    '>',  now());
        });
    }

    /** Motos libres AHORA (excluye mantenimiento) */
    public function scopeLibresAhora($query)
    {
        $bloqueantes = $this->estadosBloqueantes();

        return $query
            ->where('estado', '!=', 'mantenimiento')
            ->whereDoesntHave('reservas', function ($r) use ($bloqueantes) {
                $r->whereIn('estado', $bloqueantes)
                  ->whereDate('fecha_inicio', '<=', now())
                  ->whereDate('fecha_fin',    '>',  now());
            });
    }
}
