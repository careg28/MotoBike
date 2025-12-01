<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Modelo extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'slug','marca','nombre','categoria',
        'precio_base','deposito_sugerido',
        'specs','badges','imagenes','descripcion',
    ];

    protected $casts = [
        'precio_base'       => 'decimal:2',
        'deposito_sugerido' => 'decimal:2',
        'specs'             => 'array',
        'badges'            => 'array',
        'imagenes'          => 'array',
    ];

    public function getRouteKeyName()
    {
    return 'slug';
    }
    
    public function motos()
    {
        return $this->hasMany(Moto::class);
    }

    
}