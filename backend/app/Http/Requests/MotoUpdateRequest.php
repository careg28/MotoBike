<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class MotoUpdateRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $id = $this->route('id');

        return [
            'slug' => ['sometimes','string','max:120', Rule::unique('motos','slug')->ignore($id)],
            'marca' => ['sometimes','string','max:120'],
            'modelo' => ['sometimes','string','max:120'],
            'anio' => ['sometimes','nullable','integer','min:1990','max:2100'],
            'matricula' => ['sometimes','nullable','string','max:50', Rule::unique('motos','matricula')->ignore($id)],
            'vin' => ['sometimes','nullable','string','max:50', Rule::unique('motos','vin')->ignore($id)],
            'color' => ['sometimes','nullable','string','max:80'],
            'categoria' => ['sometimes','in:scooter,125cc,250cc,moto'],
            'estado' => ['sometimes','in:disponible,reservada,mantenimiento,retirada'],
            'precio_dia' => ['sometimes','numeric','min:0'],
            'deposito' => ['sometimes','numeric','min:0'],
            'kilometraje' => ['sometimes','integer','min:0'],
            'ubicacion' => ['sometimes','nullable','string','max:120'],
            'imagenes' => ['sometimes','nullable','array'],
            'imagenes.*' => ['string','max:255'],
            'tag' => ['sometimes','nullable','string','max:120'],
            'specs' => ['sometimes','nullable','array'],
            'badges' => ['sometimes','nullable','array'],
            'notas' => ['sometimes','nullable','string'],
        ];
    }
}
