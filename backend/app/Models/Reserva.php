<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Illuminate\Database\Eloquent\Builder;

class Reserva extends Model
{
    use HasFactory;

    public const ESTADO_HOLD     = 'hold';
    public const ESTADO_PAID     = 'paid';
    public const ESTADO_ASSIGNED = 'assigned';
    public const ESTADO_CANCELED = 'canceled';
    public const ESTADO_EXPIRED  = 'expired';

    protected $fillable = [
        'codigo',
        'modelo_id',
        'moto_id',
        'fecha_inicio',
        'fecha_fin',
        'precio_total',
        'deposito',
        'moneda',
        'estado',
        'cliente_nombre',
        'cliente_email',
        'cliente_tel',
        'payment_intent_id',
        'payment_status',
        'notas',
    ];

    protected $casts = [
        'fecha_inicio' => 'date',
        'fecha_fin'    => 'date',
        'precio_total' => 'decimal:2',
        'deposito'     => 'decimal:2',
    ];

    protected static function booted(): void
    {
        static::creating(function (Reserva $r) {
            if (empty($r->codigo)) {
                $r->codigo = self::generateCode();
            }
            if (empty($r->estado)) {
                $r->estado = self::ESTADO_HOLD;
            }
        });
    }

    public static function generateCode(): string
    {
        do {
            $code = strtoupper(Str::random(8));
        } while (self::where('codigo', $code)->exists());

        return $code;
    }

    // Relaciones
    public function modelo()
    {
        return $this->belongsTo(Modelo::class);
    }

    public function moto()
    {
        return $this->belongsTo(Moto::class);
    }

    // Scopes útiles
    public function scopeEstado(Builder $q, ?string $estado)
    {
        if ($estado) $q->where('estado', $estado);
    }

    public function scopeDelModelo(Builder $q, $modeloId)
    {
        if ($modeloId) $q->where('modelo_id', $modeloId);
    }

    public function scopeBuscar(Builder $q, ?string $term)
    {
        if ($term) {
            $q->where(function ($qq) use ($term) {
                $qq->where('codigo', 'like', "%{$term}%")
                   ->orWhere('cliente_email', 'like', "%{$term}%")
                   ->orWhere('cliente_nombre', 'like', "%{$term}%");
            });
        }
    }
}