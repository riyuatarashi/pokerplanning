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
        Schema::table('participants', function (Blueprint $table) {
            // Drop the global unique constraint on session_id
            $table->dropUnique(['session_id']);

            // Add a composite unique constraint: one participant per session per room
            $table->unique(['room_id', 'session_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('participants', function (Blueprint $table) {
            $table->dropUnique(['room_id', 'session_id']);
            $table->unique(['session_id']);
        });
    }
};
