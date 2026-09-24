<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Employees can't be hard-deleted once they have payroll history —
     * payslips.employee_id cascades on delete, so removing the employee
     * row would silently wipe out already-run payslip records. Soft
     * delete instead: the employee disappears from the active list, but
     * the row (and everything that references it) stays intact.
     */
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });
    }
};
