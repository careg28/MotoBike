<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservas', function (Blueprint $table) {
            $table->string('tipo_entrega', 20)->default('pickup')->after('moneda');
            $table->string('direccion_entrega')->nullable()->after('tipo_entrega');
            $table->string('codigo_postal', 10)->nullable()->after('direccion_entrega');
            $table->decimal('coste_entrega', 10, 2)->default(0)->after('codigo_postal');
        });
    }

    public function down(): void
    {
        Schema::table('reservas', function (Blueprint $table) {
            $table->dropColumn([
                'tipo_entrega',
                'direccion_entrega',
                'codigo_postal',
                'coste_entrega',
            ]);
        });
    }
};