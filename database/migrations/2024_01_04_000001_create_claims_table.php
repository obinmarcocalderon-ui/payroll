<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('claims', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('employee_id')->constrained('employees')->cascadeOnDelete();
            $table->string('employee_name');
            $table->string('department');
            $table->string('claim_type'); // transportation, medical, meal, training, equipment, other
            $table->text('description');
            $table->decimal('amount', 12, 2);
            $table->date('date_incurred');
            $table->date('date_submitted');
            $table->string('status')->default('submitted'); // submitted, under_review, approved, rejected, reimbursed
            $table->string('attachment_name')->nullable();
            $table->text('reviewer_note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('claims');
    }
};
