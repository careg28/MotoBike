<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
class ClienteUpdateRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        $id = $this->route('id');

        return [
            'nombre' => ['sometimes','string','max:120'],
            'apellidos' => ['sometimes','nullable','string','max:120'],
            'email' => ['sometimes','email', Rule::unique('clientes','email')->ignore($id)],
            'telefono' => ['sometimes','nullable','string','max:30'],
            'doc_tipo' => ['sometimes','nullable','in:DNI,NIE,PASAPORTE'],
            'doc_numero' => ['sometimes','nullable','string','max:50', Rule::unique('clientes','doc_numero')->ignore($id)],
            'permiso_numero' => ['sometimes','nullable','string','max:50'],
            'permiso_pais' => ['sometimes','nullable','string','max:2'],
            'fecha_nacimiento' => ['sometimes','nullable','date'],
            'direccion' => ['sometimes','nullable','string','max:255'],
            'ciudad' => ['sometimes','nullable','string','max:120'],
            'pais' => ['sometimes','nullable','string','max:2'],
            'marketing_consent' => ['sometimes','boolean'],
            'notas' => ['sometimes','nullable','string'],
        ];
    }
}