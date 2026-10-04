<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('reservas', function (Blueprint $table) {
            $table->string('cliente_documento', 100)->nullable()->after('cliente_tel');
            $table->string('cliente_nacionalidad', 100)->nullable()->after('cliente_documento');
            $table->string('cliente_direccion_origen', 255)->nullable()->after('cliente_nacionalidad');
            $table->string('cliente_direccion_hospedaje', 255)->nullable()->after('cliente_direccion_origen');
        });
    }

    public function down(): void
    {
        Schema::table('reservas', function (Blueprint $table) {
            $table->dropColumn([
                'cliente_documento',
                'cliente_nacionalidad',
                'cliente_direccion_origen',
                'cliente_direccion_hospedaje',
            ]);
        });
    }
};
