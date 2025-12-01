<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clientes', function (Blueprint $table) {
            $table->id();
            $table->string('nombre');
            $table->string('apellidos')->nullable();
            $table->string('email')->unique();
            $table->string('telefono')->nullable();

            $table->enum('doc_tipo', ['DNI','NIE','PASAPORTE'])->nullable();
            $table->string('doc_numero')->nullable()->unique();

            $table->string('permiso_numero')->nullable();
            $table->string('permiso_pais')->nullable();
            $table->date('fecha_nacimiento')->nullable();

            $table->string('direccion')->nullable();
            $table->string('ciudad')->nullable();
            $table->string('pais')->nullable();

            $table->boolean('marketing_consent')->default(false);
            $table->timestamp('verificado_en')->nullable();
            $table->text('notas')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['ciudad', 'pais']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clientes');
    }
};