<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void {
        Schema::create('media', function (Blueprint $table) {
            $table->id();
            $table->string('original_name');
            $table->string('filename');
            $table->string('mime', 120);
            $table->unsignedBigInteger('size'); // bytes
            $table->string('disk', 50)->default('public');
            $table->string('path'); // motos/abc.jpg
            $table->timestamps();
        });
    }
    public function down(): void {
        Schema::dropIfExists('media');
    }
};