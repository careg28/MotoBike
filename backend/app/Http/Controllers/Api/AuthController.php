<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    // POST /api/login
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required','email'],
            'password' => ['required','string'],
        ]);

        if (!Auth::attempt($credentials)) {
            return response()->json(['message' => 'Credenciales inválidas'], 401);
        }

        $user = $request->user();
        $token = $user->createToken('panel')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user'  => $user,
        ]);
    }

    // POST /api/logout
    public function logout(Request $request)
    {
        // Revoca solo el token actual
        $request->user()->currentAccessToken()->delete();
        return response()->json(['ok' => true]);
    }

    // GET /api/me
    public function me(Request $request)
    {
        return response()->json($request->user());
    }
}
