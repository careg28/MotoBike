<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Moto;          
use Illuminate\Support\Str;

class MotoSeeder extends Seeder
{
  public function run(): void
    {
        $motos = [
            [
                'slug' => 'vespa-primavera-125',
                'name' => 'Vespa Primavera 125',
                'tag'  => 'Vespa 125',
                'img'  => '/models/vespa-125.jpg',
                'price'=> 32,
                'specs'=> [
                    'motor' => '125 cc',
                    'consumo' => '2,2 L/100 km',
                    'velocidad' => '95 km/h',
                    'deposito' => '7 L',
                    'asiento' => '2 plazas',
                    'baul' => 'No',
                    'frenos' => 'Disco / CBS',
                    'peso' => '130 kg',
                ],
                'badges' => ['Estilo clásico', 'Ciudad + playa'],
            ],
            [
                'slug' => 'sym-symphony-125',
                'name' => 'SYM Symphony 125',
                'tag'  => 'Symphony 125',
                'img'  => '/models/symphony-125.jpg',
                'price'=> 28,
                'specs'=> [
                    'motor' => '125 cc',
                    'consumo' => '2,0 L/100 km',
                    'velocidad' => '95 km/h',
                    'deposito' => '6 L',
                    'asiento' => '2 plazas',
                    'baul' => 'Sí (28 L)',
                    'frenos' => 'Disco / CBS',
                    'peso' => '122 kg',
                ],
                'badges' => ['Muy económica', 'Fácil de manejar'],
            ],
            [
                'slug' => 'honda-pcx-125',
                'name' => 'Honda PCX 125',
                'tag'  => 'Honda PCX 125',
                'img'  => '/models/honda-125.jpg',
                'price'=> 30,
                'specs'=> [
                    'motor' => '125 cc',
                    'consumo' => '2,1 L/100 km',
                    'velocidad' => '100 km/h',
                    'deposito' => '8 L',
                    'asiento' => '2 plazas',
                    'baul' => 'Sí (30 L)',
                    'frenos' => 'ABS',
                    'peso' => '130 kg',
                ],
                'badges' => ['Confort premium', 'ABS'],
            ],
        ];

        foreach ($motos as $m) {
            // Partimos "marca" y "modelo" del name
            
            $parts = explode(' ', $m['name'], 2);
            $marca = $parts[0] ?? $m['name'];
            $modelo = $parts[1] ?? $m['name'];

            Moto::updateOrCreate(
                ['slug' => $m['slug']],
                [
                    'marca'       => $marca,
                    'modelo'      => $modelo,
                    'tag'         => $m['tag'],
                    'anio'        => 2024,
                    'matricula'   => strtoupper('TEMP-'.Str::upper(Str::random(5))), // temporal para cumplir unique
                    'vin'         => null,
                    'color'       => null,
                    'categoria'   => '125cc',
                    'estado'      => 'disponible',
                    'precio_dia'  => $m['price'],
                    'deposito'    => 150,
                    'kilometraje' => 0,
                    'ubicacion'   => 'Valencia',
                    'imagenes'    => [$m['img']],
                    'specs'       => $m['specs'],
                    'badges'      => $m['badges'],
                    'notas'       => null,
                ]
            );
        }
    }
}