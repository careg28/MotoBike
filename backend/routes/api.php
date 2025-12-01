<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\MotoController;
use App\Http\Controllers\Api\ClienteController;
use App\Http\Controllers\Api\MediaController;
use App\Http\Controllers\Api\ModeloController;
use App\Http\Controllers\Api\ReservaController;

/*
|--------------------------------------------------------------------------
| Público (lectura)
|--------------------------------------------------------------------------
*/
Route::get('/motos', [MotoController::class, 'index']);
Route::get('/motos/{slug}', [MotoController::class, 'show']);
Route::get('/motos/{slug}/precio', [MotoController::class, 'price']);

Route::get('/clientes', [ClienteController::class, 'index']);
Route::get('/clientes/{id}', [ClienteController::class, 'show']);

/* Disponibilidad y presupuesto (públicas) */
Route::get ('/modelos/{modelo:slug}/availability', [ModeloController::class, 'availability']);
Route::post('/modelos/{modelo:slug}/quote',        [ModeloController::class, 'quote']);
Route::get('/catalog/modelos', [ModeloController::class, 'catalog']);
/* Crear reserva (público, estado HOLD) */
Route::post('/reservas', [ReservaController::class, 'store']);
Route::get('/reservas/lookup/{codigo}', [ReservaController::class, 'lookup']);
Route::post('/reservas/{codigo}/cancel', [ReservaController::class, 'cancelByCode']);

/*
|--------------------------------------------------------------------------
| Auth (público)
|--------------------------------------------------------------------------
*/
Route::post('/login', [AuthController::class, 'login']);

/*
|--------------------------------------------------------------------------
| Protegido (requiere Bearer token de Sanctum)
|--------------------------------------------------------------------------
*/
Route::middleware('auth:sanctum')->group(function () {
    // Sesión
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Motos (CRUD + papelera)
    Route::post('/motos', [MotoController::class, 'store']);
    Route::match(['put','patch'], '/motos/{id}', [MotoController::class, 'update']);
    Route::delete('/motos/{id}', [MotoController::class, 'destroy']);
    Route::post('/motos/{id}/restore', [MotoController::class, 'restore']);
    Route::delete('/motos/{id}/force', [MotoController::class, 'forceDelete']);

    // Clientes (CRUD)
    Route::post('/clientes', [ClienteController::class, 'store']);
    Route::match(['put','patch'], '/clientes/{id}', [ClienteController::class, 'update']);
    Route::delete('/clientes/{id}', [ClienteController::class, 'destroy']);

    // Media
    Route::get('/media', [MediaController::class, 'index']);
    Route::post('/media', [MediaController::class, 'store']);
    Route::delete('/media/{id}', [MediaController::class, 'destroy']);

    // Modelos (admin)
    Route::get   ('/modelos',        [ModeloController::class, 'index']);
    Route::get   ('/modelos/{slug}', [ModeloController::class, 'show']);
    Route::post  ('/modelos',        [ModeloController::class, 'store']);
    Route::put   ('/modelos/{id}',   [ModeloController::class, 'update']);
    Route::delete('/modelos/{id}',   [ModeloController::class, 'destroy']);
    Route::get('/modelos/{slug}/availability', [ModeloController::class, 'availability']);

    // Reservas (admin)
    Route::get   ('/reservas',            [ReservaController::class, 'index']);
    Route::get   ('/reservas/{reserva}',  [ReservaController::class, 'show']);
    Route::patch ('/reservas/{reserva}',  [ReservaController::class, 'update']);
    Route::delete('/reservas/{reserva}',  [ReservaController::class, 'destroy']);
    
});
