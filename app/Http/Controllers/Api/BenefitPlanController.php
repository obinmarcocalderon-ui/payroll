<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class BenefitPlanController extends Controller
{
    private function client()
    {
        return Http::withHeaders([
            'X-Internal-API-Key' => env('INTERNAL_API_KEY'),
        ])->baseUrl('http://benefits-service:8007');
    }

    private function transform(array $row): array
    {
        return [
            'id' => $row['id'],
            'planName' => $row['plan_name'],
            'provider' => $row['provider'],
            'planType' => $row['plan_type'],
            'coverageAmount' => (float) $row['coverage_amount'],
            'employerSharePercent' => (float) $row['employer_share_percent'],
            'employeeSharePercent' => (float) $row['employee_share_percent'],
            'isActive' => (bool) $row['is_active'],
        ];
    }

    public function index()
    {
        $response = $this->client()->get('/plans');

        if ($response->failed()) {
            return response()->json(['message' => 'Benefits service unavailable.'], 502);
        }

        return response()->json(array_map(fn ($row) => $this->transform($row), $response->json()));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'planName' => ['required', 'string', 'max:255'],
            'provider' => ['required', 'string', 'max:255'],
            'planType' => ['required', 'in:hmo,life_insurance,retirement,wellness,other'],
            'coverageAmount' => ['required', 'numeric', 'min:0'],
            'employerSharePercent' => ['required', 'numeric', 'min:0', 'max:100'],
            'employeeSharePercent' => ['required', 'numeric', 'min:0', 'max:100'],
        ]);

        $response = $this->client()->post('/plans', [
            'plan_name' => $data['planName'],
            'provider' => $data['provider'],
            'plan_type' => $data['planType'],
            'coverage_amount' => $data['coverageAmount'],
            'employer_share_percent' => $data['employerSharePercent'],
            'employee_share_percent' => $data['employeeSharePercent'],
        ]);

        if ($response->failed()) {
            return response()->json(['message' => 'Benefits service unavailable.'], 502);
        }

        return response()->json($this->transform($response->json()), 201);
    }

    public function update(Request $request, string $benefitPlan)
    {
        $data = $request->validate([
            'planName' => ['sometimes', 'string', 'max:255'],
            'provider' => ['sometimes', 'string', 'max:255'],
            'planType' => ['sometimes', 'in:hmo,life_insurance,retirement,wellness,other'],
            'coverageAmount' => ['sometimes', 'numeric', 'min:0'],
            'employerSharePercent' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'employeeSharePercent' => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'isActive' => ['sometimes', 'boolean'],
        ]);

        $map = [
            'planName' => 'plan_name', 'provider' => 'provider', 'planType' => 'plan_type',
            'coverageAmount' => 'coverage_amount', 'employerSharePercent' => 'employer_share_percent',
            'employeeSharePercent' => 'employee_share_percent', 'isActive' => 'is_active',
        ];

        $payload = collect($data)->mapWithKeys(fn ($v, $k) => [$map[$k] => $v])->toArray();

        $response = $this->client()->patch("/plans/{$benefitPlan}", $payload);

        if ($response->status() === 404) {
            return response()->json(['message' => 'Plan not found.'], 404);
        }

        if ($response->failed()) {
            return response()->json(['message' => 'Benefits service unavailable.'], 502);
        }

        return response()->json($this->transform($response->json()));
    }
}