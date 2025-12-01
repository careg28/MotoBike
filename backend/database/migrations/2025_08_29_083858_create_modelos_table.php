<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
 {
    Schema::create('modelos', function (Blueprint $table) {
        $table->id();
        $table->string('slug',120)->unique();
        $table->string('marca',120);
        $table->string('nombre',120);
        $table->string('categoria',20);
        $table->decimal('precio_base',8,2);
        $table->decimal('deposito_sugerido',8,2)->nullable();
        $table->json('specs')->nullable();
        $table->json('badges')->nullable();
        $table->json('imagenes')->nullable();
        $table->text('descripcion')->nullable();
        $table->softDeletes();
        $table->timestamps();
    });
}

    public function down(): void
    {
        Schema::dropIfExists('modelos');
    }
};
