<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Company loan deduction, per client feedback: employees may have an
     * agreed recurring deduction (e.g. a company loan) applied every
     * payroll run until settled. Stored as a flat amount deducted each
     * cutoff — adjust per employee as their agreed terms change.
     */
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->decimal('loan_deduction_per_cutoff', 10, 2)->default(0)->after('base_salary');
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $table->dropColumn('loan_deduction_per_cutoff');
        });
    }
};
