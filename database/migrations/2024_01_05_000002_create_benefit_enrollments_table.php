<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('benefit_enrollments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->string('employee_name');
            $table->foreignUuid('plan_id')->constrained('benefit_plans')->cascadeOnDelete();
            $table->string('plan_name');
            $table->string('status')->default('pending'); // enrolled, pending, waived, terminated
            $table->date('enrollment_date');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('benefit_enrollments');
    }
};
