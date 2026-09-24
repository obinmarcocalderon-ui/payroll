<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PayrollAnomalyResource;
use App\Models\PayrollAnomaly;
use App\Models\PayrollRun;
use App\Services\PayrollAnomalyDetector;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class PayrollAnomalyController extends Controller
{
    public function index(PayrollRun $payrollRun)
    {
        return PayrollAnomalyResource::collection(
            $payrollRun->anomalies()->orderByRaw("CASE severity WHEN 'critical' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END")
                ->orderBy('employee_name')
                ->get()
        );
    }

    /**
     * Manual "Re-scan for anomalies" — the same rule engine that runs
     * automatically after compute(), available on demand so HR/Admin can
     * refresh the flags (e.g. after a related claim was edited) without
     * recomputing the whole run.
     */
    public function rescan(PayrollRun $payrollRun, PayrollAnomalyDetector $detector)
    {
        $detector->scan($payrollRun);

        return PayrollAnomalyResource::collection(
            $payrollRun->anomalies()->orderByRaw("CASE severity WHEN 'critical' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END")
                ->orderBy('employee_name')
                ->get()
        );
    }

    /**
     * HR/Admin review action: "Dismiss" (false positive, status=dismissed)
     * or "Needs correction" (status=needs_correction, blocks approval
     * until dismissed or the underlying data is fixed and rescanned).
     */
    public function update(Request $request, PayrollRun $payrollRun, PayrollAnomaly $anomaly)
    {
        if ($anomaly->payroll_run_id !== $payrollRun->id) {
            throw new NotFoundHttpException();
        }

        $data = $request->validate([
            'status' => ['required', Rule::in(PayrollAnomaly::STATUSES)],
        ]);

        $anomaly->update(['status' => $data['status']]);

        return new PayrollAnomalyResource($anomaly);
    }
}
