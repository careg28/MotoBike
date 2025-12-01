<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
 public function up(): void
    {
        Schema::table('motos', function (Blueprint $table) {
            // Solo añade si NO existe
            if (!Schema::hasColumn('motos', 'slug')) {
                $table->string('slug', 120)->unique()->after('id');
            }
            if (!Schema::hasColumn('motos', 'tag')) {
                $table->string('tag', 120)->nullable()->after('modelo');
            }
            if (!Schema::hasColumn('motos', 'imagenes')) {
                $table->json('imagenes')->nullable()->after('ubicacion');
            }
            if (!Schema::hasColumn('motos', 'specs')) {
                $table->json('specs')->nullable()->after('imagenes');
            }
            if (!Schema::hasColumn('motos', 'badges')) {
                $table->json('badges')->nullable()->after('specs');
            }
        });
    }

    public function down(): void
    {
        Schema::table('motos', function (Blueprint $table) {
            // Elimina solo si existe (evita fallos en rollback)
            if (Schema::hasColumn('motos', 'badges'))   $table->dropColumn('badges');
            if (Schema::hasColumn('motos', 'specs'))    $table->dropColumn('specs');
            if (Schema::hasColumn('motos', 'imagenes')) $table->dropColumn('imagenes');
            if (Schema::hasColumn('motos', 'tag'))      $table->dropColumn('tag');
            if (Schema::hasColumn('motos', 'slug'))     $table->dropColumn('slug');
        });
    }
};