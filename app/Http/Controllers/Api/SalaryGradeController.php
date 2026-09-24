<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SalaryGradeResource;
use App\Models\SalaryGrade;
use Illuminate\Http\Request;

class SalaryGradeController extends Controller
{
    public function index()
    {
        return SalaryGradeResource::collection(
            SalaryGrade::orderBy('grade_code')->get()
        );
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'gradeCode' => ['required', 'string', 'max:50', 'unique:salary_grades,grade_code'],
            'gradeName' => ['required', 'string', 'max:255'],
            'minSalary' => ['required', 'numeric', 'min:0'],
            'midSalary' => ['required', 'numeric', 'min:0'],
            'maxSalary' => ['required', 'numeric', 'min:0'],
            'applicablePositions' => ['required', 'string', 'max:500'],
        ]);

        $grade = SalaryGrade::create([
            'grade_code' => $data['gradeCode'],
            'grade_name' => $data['gradeName'],
            'min_salary' => $data['minSalary'],
            'mid_salary' => $data['midSalary'],
            'max_salary' => $data['maxSalary'],
            'applicable_positions' => $data['applicablePositions'],
        ]);

        return new SalaryGradeResource($grade);
    }

    public function update(Request $request, SalaryGrade $salaryGrade)
    {
        $data = $request->validate([
            'gradeCode' => ['sometimes', 'string', 'max:50'],
            'gradeName' => ['sometimes', 'string', 'max:255'],
            'minSalary' => ['sometimes', 'numeric', 'min:0'],
            'midSalary' => ['sometimes', 'numeric', 'min:0'],
            'maxSalary' => ['sometimes', 'numeric', 'min:0'],
            'applicablePositions' => ['sometimes', 'string', 'max:500'],
        ]);

        $map = [
            'gradeCode' => 'grade_code', 'gradeName' => 'grade_name',
            'minSalary' => 'min_salary', 'midSalary' => 'mid_salary', 'maxSalary' => 'max_salary',
            'applicablePositions' => 'applicable_positions',
        ];

        $salaryGrade->update(
            collect($data)->mapWithKeys(fn ($v, $k) => [$map[$k] => $v])->toArray()
        );

        return new SalaryGradeResource($salaryGrade);
    }

    public function destroy(SalaryGrade $salaryGrade)
    {
        $salaryGrade->delete();

        return response()->json(null, 204);
    }
}
