<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ReservaStoreRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'moto_id' => ['required','integer','exists:motos,id'],
            'cliente_id' => ['required','integer','exists:clientes,id'],
            'inicio' => ['required','date','before:fin'],
            'fin' => ['required','date','after:inicio'],
            'recogida_ubicacion' => ['nullable','string','max:180'],
            'devolucion_ubicacion' => ['nullable','string','max:180'],
            'estado' => ['nullable','in:pendiente,confirmada,recogida,devuelta,cancelada,no_show'],
            'precio_total' => ['nullable','numeric','min:0'],
            'deposito' => ['nullable','numeric','min:0'],
            'pago_estado' => ['nullable','in:sin_pagar,pagado,reembolsado,parcial'],
            'canal' => ['nullable','in:web,whatsapp,telefono,mostrador'],
            'referencia' => ['nullable','string','max:50','unique:reservas,referencia'],
            'notas' => ['nullable','string'],
        ];
    }
}