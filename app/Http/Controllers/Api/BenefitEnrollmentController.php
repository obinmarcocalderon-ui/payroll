<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ResolvesOwnEmployee;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class BenefitEnrollmentController extends Controller
{
    use ResolvesOwnEmployee;

    private function client()
    {
        return Http::withHeaders([
            'X-Internal-API-Key' => env('INTERNAL_API_KEY'),
        ])->baseUrl('http://benefits-service:8007');
    }

    private function transformDependent(array $row): array
    {
        return [
            'id' => $row['id'],
            'fullName' => $row['full_name'],
            'relationship' => $row['relationship'],
            'birthDate' => $row['birth_date'],
        ];
    }

    private function transform(array $row): array
    {
        return [
            'id' => $row['id'],
            'employeeId' => $row['employee_id'],
            'employeeName' => $row['employee_name'],
            'planId' => $row['plan_id'],
            'planName' => $row['plan_name'],
            'status' => $row['status'],
            'enrollmentDate' => $row['enrollment_date'],
            'dependents' => array_map(fn ($d) => $this->transformDependent($d), $row['dependents'] ?? []),
        ];
    }

    public function mine(Request $request)
    {
        $employee = $this->ownEmployee($request);

        $response = $this->client()->get('/enrollments', ['employee_id' => $employee->id]);

        if ($response->failed()) {
            return response()->json(['message' => 'Benefits service unavailable.'], 502);
        }

        return response()->json(array_map(fn ($row) => $this->transform($row), $response->json()));
    }

    public function index()
    {
        $response = $this->client()->get('/enrollments');

        if ($response->failed()) {
            return response()->json(['message' => 'Benefits service unavailable.'], 502);
        }

        return response()->json(array_map(fn ($row) => $this->transform($row), $response->json()));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'employeeId' => ['required', 'uuid', 'exists:employees,id'],
            'employeeName' => ['required', 'string', 'max:255'],
            'planId' => ['required', 'uuid'],
        ]);

        $response = $this->client()->post('/enrollments', [
            'employee_id' => $data['employeeId'],
            'employee_name' => $data['employeeName'],
            'plan_id' => $data['planId'],
        ]);

        if ($response->failed()) {
            return response()->json(['message' => 'Benefits service unavailable.'], 502);
        }

        return response()->json($this->transform($response->json()), 201);
    }

    public function update(Request $request, string $benefitEnrollment)
    {
        $data = $request->validate([
            'status' => ['required', 'in:enrolled,pending,waived,terminated'],
        ]);

        $response = $this->client()->patch("/enrollments/{$benefitEnrollment}", [
            'status' => $data['status'],
        ]);

        if ($response->status() === 404) {
            return response()->json(['message' => 'Enrollment not found.'], 404);
        }

        if ($response->failed()) {
            return response()->json(['message' => 'Benefits service unavailable.'], 502);
        }

        return response()->json($this->transform($response->json()));
    }
}