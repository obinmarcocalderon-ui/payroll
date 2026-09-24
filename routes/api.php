<?php

use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\AttendanceRecordController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BenefitEnrollmentController;
use App\Http\Controllers\Api\BenefitPlanController;
use App\Http\Controllers\Api\ClaimController;
use App\Http\Controllers\Api\CompensationAdjustmentController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\PayrollAnomalyController;
use App\Http\Controllers\Api\PayrollRunController;
use App\Http\Controllers\Api\PayslipController;
use App\Http\Controllers\Api\SalaryGradeController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

// ---------- Auth ----------
// Rate-limited so login can't be brute-forced.
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:6,1');
Route::post('/auth/verify-otp', [AuthController::class, 'verifyOtp'])->middleware('throttle:10,1');

// Everything below requires a valid Sanctum access token — the frontend is
// entirely behind a login wall, so no employee, payroll, claims, compensation,
// or benefits data should ever be reachable anonymously.
Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // ---------- User Management (admin only) ----------
    // Creating/editing/deleting login accounts and assigning roles is a
    // system-administration function, not a day-to-day HR task.
    Route::middleware('role:admin')->group(function () {
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::patch('/users/{user}', [UserController::class, 'update']);
        Route::delete('/users/{user}', [UserController::class, 'destroy']);
    });

    // ---------- Internal API (service-to-service) ----------
    // These swap out Sanctum for the internal API key, so they stay
    // outside the role-gated groups below.
    Route::get('/internal/employees/{employee}', [EmployeeController::class, 'show'])->middleware('internal.key')->withoutMiddleware('auth:sanctum');
    Route::get('/internal/payroll-runs/{payrollRun}', [PayrollRunController::class, 'show'])->middleware('internal.key')->withoutMiddleware('auth:sanctum');

    // ---------- Business modules (admin + hr_staff) ----------
    // Admin and HR staff manage the domain day-to-day; permanent removal
    // and final approval/release actions stay admin-only.
    Route::middleware('role:admin,hr_staff')->group(function () {
        // ---------- Employees ----------
        Route::get('/employees', [EmployeeController::class, 'index']);
        Route::post('/employees', [EmployeeController::class, 'store']);
        Route::get('/employees/{employee}', [EmployeeController::class, 'show']);
        Route::patch('/employees/{employee}', [EmployeeController::class, 'update']);
        Route::delete('/employees/{employee}', [EmployeeController::class, 'destroy'])->middleware('role:admin');

        // ---------- Timesheet (Attendance) ----------
        // The real source of attendance for payroll — a per-cutoff grid,
        // day-by-day per employee. Each day locks individually once saved;
        // submitting the whole timesheet locks the entire cutoff, and
        // payroll cannot be computed until that happens (see
        // PayrollRunController::compute()).
        Route::get('/payroll/runs/{payrollRun}/attendance-records', [AttendanceRecordController::class, 'indexForRun']);
        Route::post('/payroll/runs/{payrollRun}/attendance-records', [AttendanceRecordController::class, 'storeForRun']);
        Route::post('/payroll/runs/{payrollRun}/attendance-records/submit', [AttendanceRecordController::class, 'submit']);

        // Read-only date-range summary for the Employees page Attendance tab.
        Route::get('/attendance/summary', [AttendanceRecordController::class, 'summaryForPeriod']);

        // ---------- Payroll Management ----------
        // HR prepares and computes runs; final approval/release (which triggers
        // payslip emailing) and destructive actions stay with Admin.
        Route::get('/payroll/runs', [PayrollRunController::class, 'index']);
        Route::post('/payroll/runs', [PayrollRunController::class, 'store']);
        Route::get('/payroll/runs/{payrollRun}', [PayrollRunController::class, 'show']);
        Route::post('/payroll/runs/{payrollRun}/compute', [PayrollRunController::class, 'compute']);
        Route::post('/payroll/runs/{payrollRun}/approve', [PayrollRunController::class, 'approve'])->middleware('role:admin');
        Route::post('/payroll/runs/{payrollRun}/release', [PayrollRunController::class, 'release'])->middleware('role:admin');
        Route::post('/payroll/runs/{payrollRun}/archive', [PayrollRunController::class, 'archive'])->middleware('role:admin');
        Route::post('/payroll/runs/{payrollRun}/unarchive', [PayrollRunController::class, 'unarchive'])->middleware('role:admin');
        Route::delete('/payroll/runs/{payrollRun}', [PayrollRunController::class, 'destroy'])->middleware('role:admin');
        Route::get('/payroll/runs/{payrollRun}/payslips', [PayslipController::class, 'indexForRun']);
        Route::post('/payroll/runs/{payrollRun}/payslips/send-bulk', [PayslipController::class, 'sendBulk']);
        Route::get('/payroll/payslips/{payslip}', [PayslipController::class, 'show']);
        Route::post('/payroll/payslips/{payslip}/send', [PayslipController::class, 'send']);

        // ---------- AI-Powered Payroll Anomaly Detection ----------
        // Reviewing/rescanning is a QA step open to HR and Admin alike (same
        // tier as compute()); only the run-level approve/release/delete
        // actions above are admin-only.
        Route::get('/payroll/runs/{payrollRun}/anomalies', [PayrollAnomalyController::class, 'index']);
        Route::post('/payroll/runs/{payrollRun}/anomalies/rescan', [PayrollAnomalyController::class, 'rescan']);
        Route::patch('/payroll/runs/{payrollRun}/anomalies/{anomaly}', [PayrollAnomalyController::class, 'update']);

        // ---------- Compensation Planning ----------
        // HR can view grades and request adjustments; defining salary
        // structures and deciding (approving/rejecting) adjustments is admin-only.
        Route::get('/compensation/salary-grades', [SalaryGradeController::class, 'index']);
        Route::middleware('role:admin')->group(function () {
            Route::post('/compensation/salary-grades', [SalaryGradeController::class, 'store']);
            Route::patch('/compensation/salary-grades/{salaryGrade}', [SalaryGradeController::class, 'update']);
            Route::delete('/compensation/salary-grades/{salaryGrade}', [SalaryGradeController::class, 'destroy']);
        });

        Route::get('/compensation/adjustments', [CompensationAdjustmentController::class, 'index']);
        Route::post('/compensation/adjustments', [CompensationAdjustmentController::class, 'store']);
        Route::patch('/compensation/adjustments/{compensationAdjustment}', [CompensationAdjustmentController::class, 'update'])->middleware('role:admin');

        // ---------- Claims & Reimbursement ----------
        Route::get('/claims', [ClaimController::class, 'index']);
        Route::post('/claims', [ClaimController::class, 'store']);
        Route::get('/claims/{claim}', [ClaimController::class, 'show']);
        Route::patch('/claims/{claim}', [ClaimController::class, 'update']);
        Route::post('/claims/{claim}/reimburse', [ClaimController::class, 'reimburse']);

        // ---------- HMO & Benefits Administration ----------
        Route::get('/benefits/plans', [BenefitPlanController::class, 'index']);
        Route::post('/benefits/plans', [BenefitPlanController::class, 'store']);
        Route::patch('/benefits/plans/{benefitPlan}', [BenefitPlanController::class, 'update']);

        Route::get('/benefits/enrollments', [BenefitEnrollmentController::class, 'index']);
        Route::post('/benefits/enrollments', [BenefitEnrollmentController::class, 'store']);
        Route::patch('/benefits/enrollments/{benefitEnrollment}', [BenefitEnrollmentController::class, 'update']);

        // ---------- HR Analytics ----------
        Route::get('/analytics/summary', [AnalyticsController::class, 'summary']);
    });
});