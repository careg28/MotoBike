<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class MotoStoreRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'slug' => ['required','string','max:120','unique:motos,slug'],
            'marca' => ['required','string','max:120'],
            'modelo' => ['required','string','max:120'],
            'anio' => ['nullable','integer','min:1990','max:2100'],
            'matricula' => ['nullable','string','max:50','unique:motos,matricula'],
            'vin' => ['nullable','string','max:50','unique:motos,vin'],
            'color' => ['nullable','string','max:80'],
            'categoria' => ['required','in:scooter,125cc,250cc,moto'],
            'estado' => ['in:disponible,reservada,mantenimiento,retirada'],
            'precio_dia' => ['required','numeric','min:0'],
            'deposito' => ['nullable','numeric','min:0'],
            'kilometraje' => ['nullable','integer','min:0'],
            'ubicacion' => ['nullable','string','max:120'],
            'imagenes' => ['nullable','array'],
            'imagenes.*' => ['string','max:255'],
            'tag' => ['nullable','string','max:120'],
            'specs' => ['nullable','array'],
            'badges' => ['nullable','array'],
            'notas' => ['nullable','string'],
        ];
    }
}