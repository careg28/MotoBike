<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
  public function up(): void
{
    // si la columna ya existe, solo añadimos la fk
    Schema::table('motos', function (Blueprint $table) {
        // por si ya existe una fk previa corrupta:
        // try { $table->dropForeign(['modelo_id']); } catch (\Throwable $e) {}

        $table->foreign('modelo_id')
              ->references('id')->on('modelos')
              ->nullOnDelete(); // ON DELETE SET NULL
    });
}

public function down(): void
{
    Schema::table('motos', function (Blueprint $table) {
        $table->dropForeign(['modelo_id']);
    });
}
};
