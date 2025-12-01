<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
       Schema::create('motos', function (Blueprint $table) {
    $table->id();

    // crea columna pero sin constraint aquí
    $table->unsignedBigInteger('modelo_id')->nullable();

    $table->string('slug',120)->unique();
    $table->string('marca',120);
    $table->string('modelo',120);
    $table->year('anio')->nullable();
    $table->string('matricula',50)->nullable();
    $table->string('vin',50)->nullable();
    $table->string('color',80)->nullable();
    $table->enum('categoria', ['scooter','125cc','250cc','moto'])->default('125cc');
    $table->enum('estado', ['disponible','reservada','mantenimiento','retirada'])->default('disponible');
    $table->decimal('precio_dia',8,2);
    $table->decimal('deposito',8,2)->default(0);
    $table->unsignedInteger('kilometraje')->default(0);
    $table->string('ubicacion',120)->nullable();
    $table->json('imagenes')->nullable();
    $table->string('tag',120)->nullable();
    $table->json('specs')->nullable();
    $table->json('badges')->nullable();
    $table->text('notas')->nullable();
    $table->timestamps();
    $table->softDeletes();

    $table->index(['estado','categoria']);
    $table->unique(['matricula','deleted_at']);
    $table->unique(['vin','deleted_at']);
});
    }

    public function down(): void
    {
        Schema::dropIfExists('motos');
    }
};
