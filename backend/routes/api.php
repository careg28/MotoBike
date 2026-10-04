<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\MotoController;
use App\Http\Controllers\Api\ClienteController;
use App\Http\Controllers\Api\MediaController;
use App\Http\Controllers\Api\ModeloController;
use App\Http\Controllers\Api\ReservaController;
use App\Http\Controllers\Api\ContactController;
use App\Http\Controllers\Api\FrontendLogController;

/*
|--------------------------------------------------------------------------
| Público (lectura)
|--------------------------------------------------------------------------
*/
Route::get('/motos', [MotoController::class, 'index']);
Route::get('/motos/{slug}', [MotoController::class, 'show']);
Route::get('/motos/{slug}/precio', [MotoController::class, 'price']);
   Route::get('/modelos/admin-list', [ModeloController::class, 'adminList']);          // <-- FIJA primero
    Route::get('/modelos/{slug}/availability', [ModeloController::class, 'availability']); // <-- FIJA también
    Route::get   ('/modelos',        [ModeloController::class, 'index']);
    Route::get   ('/modelos/{slug}', [ModeloController::class, 'show']);

Route::get('/clientes', [ClienteController::class, 'index']);
Route::get('/clientes/{id}', [ClienteController::class, 'show']);
Route::post('/contact', [ContactController::class, 'send'])
    ->middleware('throttle:3,1'); // 
Route::post('/front-log', [FrontendLogController::class, 'store'])
    ->middleware('throttle:20,1');
Route::get('/media/file/{path}', [MediaController::class, 'file'])->where('path', '.*');
/* Disponibilidad y presupuesto (públicas) */
Route::get ('/modelos/{modelo:slug}/availability', [ModeloController::class, 'availability']);
Route::post('/modelos/{modelo:slug}/quote',        [ModeloController::class, 'quote']);
Route::get('/catalog/modelos', [ModeloController::class, 'catalog']);
/* Crear reserva (público, estado HOLD) */
Route::post('/reservas', [ReservaController::class, 'store'])->middleware('throttle:5,1');
Route::post('/reservas/checkout', [ReservaController::class, 'checkout'])->middleware('throttle:5,1');
Route::get('/reservas/lookup/{codigo}', [ReservaController::class, 'lookup']);
Route::post('/reservas/{codigo}/cancel', [ReservaController::class, 'cancelByCode']);

Route::post('/stripe/webhook', [ReservaController::class, 'stripeWebhook']);
Route::get('/stripe/session/{sessionId}', [ReservaController::class, 'stripeSessionDetails']);
Route::prefix('public')->group(function () {
    // Tracking / seguimiento
    Route::get('/reservas/lookup/{codigo}', [ReservaController::class, 'lookup']);

    
});


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
 
    Route::post  ('/modelos',        [ModeloController::class, 'store']);
    Route::put   ('/modelos/{id}',   [ModeloController::class, 'update']);
    Route::delete('/modelos/{id}',   [ModeloController::class, 'destroy']);

    // Reservas (admin)
    Route::get   ('/reservas',            [ReservaController::class, 'index']);
    Route::get   ('/reservas/{reserva}',  [ReservaController::class, 'show']);
    Route::patch ('/reservas/{reserva}',  [ReservaController::class, 'update']);
    Route::delete('/reservas/{reserva}',  [ReservaController::class, 'destroy']);
    Route::get('/reservas/{reserva}/motos-libres', [ReservaController::class, 'motosLibres']);
    
});
