<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('reservas', function (Blueprint $table) {
            $table->id();

            $table->string('codigo', 16)->unique();

            $table->foreignId('modelo_id')
                ->constrained('modelos')
                ->cascadeOnUpdate()
                ->restrictOnDelete();

            $table->foreignId('moto_id')
                ->nullable()
                ->constrained('motos')
                ->nullOnDelete();

            $table->date('fecha_inicio');
            $table->date('fecha_fin');

            $table->decimal('precio_total', 10, 2);
            $table->decimal('deposito', 10, 2)->nullable();
            $table->char('moneda', 3)->default('EUR');

            $table->string('estado', 20)->default('hold')->index();

            // Datos cliente
            $table->string('cliente_nombre');
            $table->string('cliente_email')->index();
            $table->string('cliente_tel')->nullable();

            // Pago / integraciones
            $table->string('payment_intent_id')->nullable()->index();
            $table->string('payment_status')->nullable();

            $table->text('notas')->nullable();

            $table->timestamps();

            // Índice útil para búsquedas de disponibilidad por modelo/fechas
            $table->index(['modelo_id', 'fecha_inicio', 'fecha_fin'], 'reservas_modelo_fecha_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reservas');
    }
};