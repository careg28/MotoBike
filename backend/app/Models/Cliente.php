<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Cliente extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'nombre','apellidos','email','telefono',
        'doc_tipo','doc_numero',
        'permiso_numero','permiso_pais','fecha_nacimiento',
        'direccion','ciudad','pais',
        'marketing_consent','verificado_en','notas'
    ];

    protected $casts = [
        'marketing_consent' => 'boolean',
        'verificado_en' => 'datetime',
        'fecha_nacimiento' => 'date',
    ];

    public function reservas()
    {
        return $this->hasMany(Reserva::class);
    }
}