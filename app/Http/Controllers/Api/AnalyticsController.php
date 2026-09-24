<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BenefitEnrollment;
use App\Models\BenefitPlan;
use App\Models\Claim;
use App\Models\Employee;
use App\Models\PayrollRun;

class AnalyticsController extends Controller
{
    public function summary()
    {
        $latestRun = PayrollRun::orderByDesc('pay_period_start')->first();

        $totalActiveEmployees = Employee::where('employment_status', 'active')->count();

        $pendingClaimsCount = Claim::whereIn('status', ['submitted', 'under_review'])->count();

        $totalEnrollments = BenefitEnrollment::where('status', 'enrolled')->count();
        $benefitsEnrollmentRate = $totalActiveEmployees > 0
            ? round(($totalEnrollments / $totalActiveEmployees) * 100, 1)
            : 0;

        $payrollCostTrend = PayrollRun::orderBy('pay_period_start')
            ->limit(12)
            ->get()
            ->map(fn ($run) => [
                'period' => $run->cutoff_label,
                'grossCost' => (float) $run->gross_total,
                'netCost' => (float) $run->net_total,
                'deductions' => (float) $run->deductions_total,
            ]);

        $claimsByType = Claim::select('claim_type')
            ->selectRaw('SUM(amount) as total_amount')
            ->selectRaw('COUNT(*) as claim_count')
            ->groupBy('claim_type')
            ->get()
            ->map(fn ($row) => [
                'claimType' => $row->claim_type,
                'totalAmount' => (float) $row->total_amount,
                'count' => (int) $row->claim_count,
            ]);

        $benefitsUtilization = BenefitPlan::withCount([
            'enrollments as enrolled_count' => fn ($q) => $q->where('status', 'enrolled'),
        ])->get()->map(fn ($plan) => [
            'planName' => $plan->plan_name,
            'enrolled' => $plan->enrolled_count,
            'capacity' => $totalActiveEmployees,
        ]);

        return response()->json([
            'totalPayrollCostThisPeriod' => (float) ($latestRun->gross_total ?? 0),
            'totalActiveEmployees' => $totalActiveEmployees,
            'pendingClaimsCount' => $pendingClaimsCount,
            'benefitsEnrollmentRate' => $benefitsEnrollmentRate,
            'payrollCostTrend' => $payrollCostTrend,
            'claimsByType' => $claimsByType,
            'benefitsUtilization' => $benefitsUtilization,
        ]);
    }
}
