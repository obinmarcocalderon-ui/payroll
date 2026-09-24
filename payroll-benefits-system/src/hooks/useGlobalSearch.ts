import { useEffect, useRef, useState } from 'react';
import { payrollService } from '../services/payroll.service';
import { claimsService } from '../services/claims.service';
import { compensationService } from '../services/compensation.service';
import { benefitsService } from '../services/benefits.service';
import { employeeService } from '../services/employee.service';

export interface SearchResult {
  id: string;
  category: 'Employees' | 'Payroll' | 'Claims' | 'Compensation' | 'Benefits';
  title: string;
  subtitle: string;
  linkTo: string;
}

/**
 * Debounced search across the currently loaded API modules. There's no
 * dedicated backend search endpoint, so this fans out to each module's
 * list endpoint and filters client-side by name/label — good enough for
 * the record volumes this system deals with, and avoids needing a new
 * backend route just for search.
 */
export function useGlobalSearch(query: string) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = query.trim().toLowerCase();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const [employees, runs, claims, grades, adjustments, plans, enrollments] = await Promise.all([
          employeeService.list().catch(() => []),
          payrollService.listRuns().catch(() => []),
          claimsService.listClaims().catch(() => []),
          compensationService.listSalaryGrades().catch(() => []),
          compensationService.listAdjustments().catch(() => []),
          benefitsService.listPlans().catch(() => []),
          benefitsService.listEnrollments().catch(() => []),
        ]);

        const found: SearchResult[] = [];

        employees
          .filter(
            (e) =>
              `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
              e.email.toLowerCase().includes(q) ||
              e.department.toLowerCase().includes(q) ||
              e.employeeNumber.toLowerCase().includes(q)
          )
          .forEach((e) =>
            found.push({
              id: e.id,
              category: 'Employees',
              title: `${e.firstName} ${e.lastName}`,
              subtitle: `${e.position} · ${e.department}`,
              linkTo: '/employees',
            })
          );

        runs
          .filter((r) => r.cutoffLabel.toLowerCase().includes(q))
          .forEach((r) =>
            found.push({
              id: r.id,
              category: 'Payroll',
              title: r.cutoffLabel,
              subtitle: `Payroll run · ${r.status}`,
              linkTo: '/payroll',
            })
          );

        claims
          .filter(
            (c) =>
              c.employeeName.toLowerCase().includes(q) ||
              c.description.toLowerCase().includes(q) ||
              c.department.toLowerCase().includes(q)
          )
          .forEach((c) =>
            found.push({
              id: c.id,
              category: 'Claims',
              title: c.employeeName,
              subtitle: `${c.claimType} claim · ${c.status}`,
              linkTo: '/claims',
            })
          );

        grades
          .filter((g) => g.gradeName.toLowerCase().includes(q) || g.gradeCode.toLowerCase().includes(q))
          .forEach((g) =>
            found.push({
              id: g.id,
              category: 'Compensation',
              title: `${g.gradeCode} — ${g.gradeName}`,
              subtitle: 'Salary grade',
              linkTo: '/compensation',
            })
          );

        adjustments
          .filter((a) => a.employeeName.toLowerCase().includes(q))
          .forEach((a) =>
            found.push({
              id: a.id,
              category: 'Compensation',
              title: a.employeeName,
              subtitle: `Adjustment request · ${a.status}`,
              linkTo: '/compensation',
            })
          );

        plans
          .filter((p) => p.planName.toLowerCase().includes(q) || p.provider.toLowerCase().includes(q))
          .forEach((p) =>
            found.push({
              id: p.id,
              category: 'Benefits',
              title: p.planName,
              subtitle: `${p.provider} · benefit plan`,
              linkTo: '/benefits',
            })
          );

        enrollments
          .filter((e) => e.employeeName.toLowerCase().includes(q))
          .forEach((e) =>
            found.push({
              id: e.id,
              category: 'Benefits',
              title: e.employeeName,
              subtitle: `Enrolled in ${e.planName}`,
              linkTo: '/benefits',
            })
          );

        setResults(found.slice(0, 20));
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return { results, loading };
}
