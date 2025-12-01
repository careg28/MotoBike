<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ClienteStoreRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'nombre' => ['required','string','max:120'],
            'apellidos' => ['nullable','string','max:120'],
            'email' => ['required','email','unique:clientes,email'],
            'telefono' => ['nullable','string','max:30'],
            'doc_tipo' => ['nullable','in:DNI,NIE,PASAPORTE'],
            'doc_numero' => ['nullable','string','max:50','unique:clientes,doc_numero'],
            'permiso_numero' => ['nullable','string','max:50'],
            'permiso_pais' => ['nullable','string','max:2'],
            'fecha_nacimiento' => ['nullable','date'],
            'direccion' => ['nullable','string','max:255'],
            'ciudad' => ['nullable','string','max:120'],
            'pais' => ['nullable','string','max:2'],
            'marketing_consent' => ['boolean'],
            'notas' => ['nullable','string'],
        ];
    }
}
