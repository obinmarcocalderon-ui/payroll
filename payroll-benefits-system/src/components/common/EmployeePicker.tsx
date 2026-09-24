import { useApiResource } from '../../hooks/useApiResource';
import { employeeService } from '../../services/employee.service';
import type { Employee } from '../../types';

interface EmployeePickerProps {
  value: string;
  onChange: (employee: Employee | null) => void;
  required?: boolean;
}

/**
 * Dropdown of employees, sourced from the Employees module. Used anywhere
 * a form needs to reference an employee (Claims, Compensation Adjustments,
 * Benefit Enrollments) so the person filling the form doesn't have to
 * copy-paste a UUID by hand.
 */
export function EmployeePicker({ value, onChange, required }: EmployeePickerProps) {
  const { data: employees, loading } = useApiResource(() => employeeService.list(), []);

  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-ink-900">
        Employee
        {required && <span className="text-clay-600"> *</span>}
      </span>
      <select
        required={required}
        value={value}
        onChange={(e) => {
          const emp = employees?.find((emp) => emp.id === e.target.value) ?? null;
          onChange(emp);
        }}
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink-900 outline-none transition focus:border-teal-500"
      >
        <option value="">{loading ? 'Loading employees…' : 'Select an employee'}</option>
        {!loading && employees?.length === 0 && (
          <option value="" disabled>
            No employees yet — add one in the Employees page first
          </option>
        )}
        {employees?.map((emp) => (
          <option key={emp.id} value={emp.id}>
            {emp.firstName} {emp.lastName} — {emp.department}
          </option>
        ))}
      </select>
    </label>
  );
}
