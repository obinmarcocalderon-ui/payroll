<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Attendance summaries are a simplified stand-in for data that would
     * normally arrive from a separate Time & Attendance / Workforce
     * Management system. This subsystem (Payroll & Benefits) only needs
     * the per-employee, per-pay-period totals to compute payroll — not
     * the full clock-in/out log — so that's all this table stores.
     */
    public function up(): void
    {
        Schema::create('attendance_summaries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('payroll_run_id')->constrained('payroll_runs')->cascadeOnDelete();
            $table->foreignUuid('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->string('employee_name');
            $table->decimal('days_present', 5, 2)->default(0);
            $table->unsignedInteger('late_minutes')->default(0);
            $table->decimal('overtime_hours', 5, 2)->default(0);
            $table->decimal('unpaid_absence_days', 5, 2)->default(0);
            $table->timestamps();

            $table->unique(['payroll_run_id', 'employee_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_summaries');
    }
};
