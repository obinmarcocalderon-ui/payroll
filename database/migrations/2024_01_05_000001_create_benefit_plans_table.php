<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('benefit_plans', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('plan_name');
            $table->string('provider');
            $table->string('plan_type'); // hmo, life_insurance, retirement, wellness, other
            $table->decimal('coverage_amount', 12, 2)->default(0);
            $table->decimal('employer_share_percent', 5, 2)->default(0);
            $table->decimal('employee_share_percent', 5, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('benefit_plans');
    }
};
