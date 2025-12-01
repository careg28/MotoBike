<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Http\Requests\ClienteStoreRequest;
use App\Http\Requests\ClienteUpdateRequest;
use App\Models\Cliente;
class ClienteController extends Controller
{
    public function index(Request $request)
    {
        $q = Cliente::query();

        if ($s = $request->get('search')) {
            $q->where(function($w) use ($s) {
                $w->where('nombre', 'like', "%$s%")
                  ->orWhere('apellidos', 'like', "%$s%")
                  ->orWhere('email', 'like', "%$s%");
            });
        }

        return response()->json($q->orderByDesc('id')->paginate(20));
    }

    public function show(int $id)
    {
        return response()->json(Cliente::findOrFail($id));
    }

    public function store(ClienteStoreRequest $request)
    {
        $cliente = Cliente::create($request->validated());
        return response()->json($cliente, 201);
    }

    public function update(ClienteUpdateRequest $request, int $id)
    {
        $cliente = Cliente::findOrFail($id);
        $cliente->update($request->validated());
        return response()->json($cliente);
    }

    public function destroy(int $id)
    {
        $cliente = Cliente::findOrFail($id);
        $cliente->delete();
        return response()->json(['deleted' => true]);
    }
}