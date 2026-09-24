<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\ResolvesOwnEmployee;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class ClaimController extends Controller
{
    use ResolvesOwnEmployee;

    private function client()
    {
        return Http::withHeaders([
            'X-Internal-API-Key' => env('INTERNAL_API_KEY'),
        ])->baseUrl('http://claims-service:8006');
    }

    private function transform(array $row): array
    {
        return [
            'id' => $row['id'],
            'employeeId' => $row['employee_id'],
            'employeeName' => $row['employee_name'],
            'department' => $row['department'],
            'claimType' => $row['claim_type'],
            'description' => $row['description'],
            'amount' => (float) $row['amount'],
            'dateIncurred' => $row['date_incurred'],
            'dateSubmitted' => $row['date_submitted'],
            'status' => $row['status'],
            'attachmentName' => $row['attachment_name'] ?? null,
            'reviewerNote' => $row['reviewer_note'] ?? null,
        ];
    }

    public function mine(Request $request)
    {
        $employee = $this->ownEmployee($request);

        $response = $this->client()->get('/claims', ['employee_id' => $employee->id]);

        if ($response->failed()) {
            return response()->json(['message' => 'Claims service unavailable.'], 502);
        }

        return response()->json(array_map(fn ($row) => $this->transform($row), $response->json()));
    }

    public function storeMine(Request $request)
    {
        $employee = $this->ownEmployee($request);

        $data = $request->validate([
            'claimType' => ['required', 'in:transportation,medical,meal,training,equipment,other'],
            'description' => ['required', 'string'],
            'amount' => ['required', 'numeric', 'min:0'],
            'dateIncurred' => ['required', 'date'],
        ]);

        $response = $this->client()->post('/claims', [
            'employee_id' => $employee->id,
            'employee_name' => "{$employee->first_name} {$employee->last_name}",
            'department' => $employee->department,
            'claim_type' => $data['claimType'],
            'description' => $data['description'],
            'amount' => $data['amount'],
            'date_incurred' => $data['dateIncurred'],
        ]);

        if ($response->failed()) {
            return response()->json(['message' => 'Claims service unavailable.'], 502);
        }

        return response()->json($this->transform($response->json()), 201);
    }

    public function index()
    {
        $response = $this->client()->get('/claims');

        if ($response->failed()) {
            return response()->json(['message' => 'Claims service unavailable.'], 502);
        }

        return response()->json(array_map(fn ($row) => $this->transform($row), $response->json()));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'employeeId' => ['required', 'uuid', 'exists:employees,id'],
            'employeeName' => ['required', 'string', 'max:255'],
            'department' => ['required', 'string', 'max:255'],
            'claimType' => ['required', 'in:transportation,medical,meal,training,equipment,other'],
            'description' => ['required', 'string'],
            'amount' => ['required', 'numeric', 'min:0'],
            'dateIncurred' => ['required', 'date'],
        ]);

        $response = $this->client()->post('/claims', [
            'employee_id' => $data['employeeId'],
            'employee_name' => $data['employeeName'],
            'department' => $data['department'],
            'claim_type' => $data['claimType'],
            'description' => $data['description'],
            'amount' => $data['amount'],
            'date_incurred' => $data['dateIncurred'],
        ]);

        if ($response->failed()) {
            return response()->json(['message' => 'Claims service unavailable.'], 502);
        }

        return response()->json($this->transform($response->json()), 201);
    }

    public function show(string $claim)
    {
        $response = $this->client()->get("/claims/{$claim}");

        if ($response->status() === 404) {
            return response()->json(['message' => 'Claim not found.'], 404);
        }

        if ($response->failed()) {
            return response()->json(['message' => 'Claims service unavailable.'], 502);
        }

        return response()->json($this->transform($response->json()));
    }

    public function update(Request $request, string $claim)
    {
        $data = $request->validate([
            'status' => ['required', 'in:submitted,under_review,approved,rejected,reimbursed'],
            'reviewerNote' => ['nullable', 'string'],
        ]);

        $response = $this->client()->patch("/claims/{$claim}", [
            'status' => $data['status'],
            'reviewer_note' => $data['reviewerNote'] ?? null,
        ]);

        if ($response->status() === 404) {
            return response()->json(['message' => 'Claim not found.'], 404);
        }

        if ($response->failed()) {
            return response()->json(['message' => 'Claims service unavailable.'], 502);
        }

        return response()->json($this->transform($response->json()));
    }

    public function reimburse(string $claim)
    {
        $response = $this->client()->post("/claims/{$claim}/reimburse");

        if ($response->status() === 404) {
            return response()->json(['message' => 'Claim not found.'], 404);
        }

        if ($response->failed()) {
            return response()->json(['message' => 'Claims service unavailable.'], 502);
        }

        return response()->json($this->transform($response->json()));
    }
}