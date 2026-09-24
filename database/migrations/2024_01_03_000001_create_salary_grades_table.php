<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('salary_grades', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('grade_code')->unique();
            $table->string('grade_name');
            $table->decimal('min_salary', 12, 2);
            $table->decimal('mid_salary', 12, 2);
            $table->decimal('max_salary', 12, 2);
            $table->string('applicable_positions');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('salary_grades');
    }
};
