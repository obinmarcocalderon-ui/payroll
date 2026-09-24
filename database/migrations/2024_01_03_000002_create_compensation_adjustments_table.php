<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('compensation_adjustments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->string('employee_name');
            $table->string('adjustment_type'); // merit_increase, promotion, market_adjustment, annual_increment
            $table->decimal('current_salary', 12, 2);
            $table->decimal('proposed_salary', 12, 2);
            $table->date('effective_date');
            $table->text('justification');
            $table->string('status')->default('pending'); // pending, approved, rejected, implemented
            $table->string('requested_by');
            $table->timestamp('requested_at')->useCurrent();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('compensation_adjustments');
    }
};
