<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reservas', function (Blueprint $table) {

            // ID de la sesión de Stripe Checkout
            $table->string('checkout_session_id')
                ->nullable()
                ->after('payment_intent_id')
                ->index();

            // proveedor de pago (stripe)
            $table->string('payment_provider', 30)
                ->nullable()
                ->after('payment_status');

            // fecha en que se confirmó el pago
            $table->timestamp('paid_at')
                ->nullable()
                ->after('payment_provider');

            // expiración del HOLD (por ejemplo 15 minutos)
            $table->timestamp('hold_expires_at')
                ->nullable()
                ->after('paid_at');
        });
    }

    public function down(): void
    {
        Schema::table('reservas', function (Blueprint $table) {

            $table->dropIndex(['checkout_session_id']);

            $table->dropColumn([
                'checkout_session_id',
                'payment_provider',
                'paid_at',
                'hold_expires_at'
            ]);
        });
    }
};