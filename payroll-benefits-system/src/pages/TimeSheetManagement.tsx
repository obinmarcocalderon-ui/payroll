import { useState } from 'react';
import { CalendarCheck, Lock, ShieldCheck, ClipboardList } from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingState, ErrorState } from '../components/common/LoadError';
import { useApiResource } from '../hooks/useApiResource';
import { payrollService } from '../services/payroll.service';
import type { PayrollRun, TimesheetForRun, TimesheetDayStatus } from '../types';
import { formatDate } from '../utils/format';

const STATUS_LABEL: Record<TimesheetDayStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  day_off: 'Day off',
};

function RunPicker({ runs, onPick }: { runs: PayrollRun[]; onPick: (id: string) => void }) {
  if (runs.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No draft payroll runs"
        description="Start a new payroll run from Payroll Management first — its timesheet will appear here once it's a draft."
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {runs.map((r) => (
        <button
          key={r.id}
          onClick={() => onPick(r.id)}
          className="rounded-xl border border-line bg-surface p-4 text-left shadow-sm transition hover:border-teal-500"
        >
          <p className="font-semibold text-ink-900">{r.cutoffLabel}</p>
          <p className="mt-1 text-xs text-ink-500">
            {formatDate(r.payPeriodStart)} – {formatDate(r.payPeriodEnd)}
          </p>
        </button>
      ))}
    </div>
  );
}

function TimesheetGrid({ run, onSubmitted }: { run: PayrollRun; onSubmitted: () => void }) {
  const { data, loading, error, refetch } = useApiResource<TimesheetForRun>(
    () => payrollService.getTimesheet(run.id),
    [run.id]
  );
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const locked = data?.isLocked ?? false;

  async function saveDay(
    employeeId: string,
    date: string,
    status: TimesheetDayStatus,
    minutesLate: number,
    overtimeMinutes: number
  ) {
    const key = `${employeeId}|${date}`;
    setPendingKey(key);
    try {
      await payrollService.saveTimesheetDay(run.id, {
        employeeId,
        date,
        status,
        minutesLate,
        overtimeMinutes,
      });
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not save this day.');
    } finally {
      setPendingKey(null);
    }
  }

  async function handleSubmit() {
    if (!confirm('Submit this timesheet? Once submitted, no day can be edited or added, for any employee.')) {
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await payrollService.submitTimesheet(run.id);
      refetch();
      onSubmitted();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not submit the timesheet.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState label="Loading timesheet…" />;
  if (error) return <ErrorState message={error} onRetry={refetch} />;
  if (!data || data.sheet.length === 0) {
    return (
      <EmptyState
        icon={CalendarCheck}
        title="No active employees"
        description="Add active employees in the Employees module before recording attendance."
      />
    );
  }

  const dates = data.sheet[0]?.days.map((d) => d.date) ?? [];

  return (
    <div className="space-y-4">
      {locked ? (
        <div className="flex items-center gap-2 rounded-xl border border-line bg-teal-100/40 px-4 py-3 text-sm text-ink-900">
          <Lock size={16} className="text-teal-700" />
          Timesheet submitted{data.timesheetSubmittedAt ? ` on ${formatDate(data.timesheetSubmittedAt)}` : ''} and
          locked. No day can be changed.
        </div>
      ) : (
        <div className="rounded-xl border border-line bg-clay-100/30 p-4 text-sm text-ink-900">
          Each day locks the moment it's saved. Once you submit, the whole cutoff becomes final — review carefully
          before submitting.
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-sm">
        <table className="w-full min-w-max text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-sand-50/70">
              <th className="sticky left-0 z-10 bg-sand-50/70 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-ink-500">
                Employee
              </th>
              {dates.map((d) => (
                <th key={d} className="whitespace-nowrap px-3 py-3 text-center text-xs font-semibold uppercase tracking-wide text-ink-500">
                  {formatDate(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.sheet.map((row) => (
              <tr key={row.employeeId} className="border-b border-line last:border-0">
                <td className="sticky left-0 z-10 bg-surface px-4 py-2.5 font-medium text-ink-900">
                  {row.employeeName}
                </td>
                {row.days.map((day) => {
                  const key = `${row.employeeId}|${day.date}`;
                  const cellLocked = locked || day.isLocked;
                  return (
                    <td key={day.date} className="px-2 py-2 text-center align-top">
                      <select
                        value={day.status ?? 'present'}
                        disabled={cellLocked || pendingKey === key}
                        onChange={(e) =>
                          saveDay(
                            row.employeeId,
                            day.date,
                            e.target.value as TimesheetDayStatus,
                            day.minutesLate,
                            day.overtimeMinutes
                          )
                        }
                        className="w-24 rounded-md border border-line bg-surface px-1.5 py-1 text-xs text-ink-900 outline-none focus:border-teal-500 disabled:bg-sand-50 disabled:text-ink-500"
                      >
                        {(Object.entries(STATUS_LABEL) as [TimesheetDayStatus, string][]).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                      {!cellLocked && (
                        <div className="mt-1 flex justify-center gap-1">
                          <input
                            type="number"
                            min={0}
                            defaultValue={day.minutesLate}
                            title="Late (min)"
                            onBlur={(e) =>
                              saveDay(row.employeeId, day.date, day.status ?? 'present', Number(e.target.value), day.overtimeMinutes)
                            }
                            className="w-11 rounded-md border border-line px-1 py-0.5 text-center text-[11px] outline-none focus:border-teal-500"
                          />
                          <input
                            type="number"
                            min={0}
                            defaultValue={day.overtimeMinutes}
                            title="Overtime (min)"
                            onBlur={(e) =>
                              saveDay(row.employeeId, day.date, day.status ?? 'present', day.minutesLate, Number(e.target.value))
                            }
                            className="w-11 rounded-md border border-line px-1 py-0.5 text-center text-[11px] outline-none focus:border-teal-500"
                          />
                        </div>
                      )}
                      {cellLocked && (
                        <p className="mt-1 text-[10px] text-ink-300">
                          {day.minutesLate}m late · {day.overtimeMinutes}m OT
                        </p>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!locked && (
        <div className="flex flex-col items-end gap-2">
          {submitError && <p className="text-sm text-bad-600">{submitError}</p>}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-50"
          >
            <ShieldCheck size={16} />
            {submitting ? 'Submitting…' : 'Submit timesheet'}
          </button>
        </div>
      )}
    </div>
  );
}

export function TimesheetManagement() {
  const { data: runs, loading, error, refetch } = useApiResource<PayrollRun[]>(
    () => payrollService.listRuns(),
    []
  );
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const draftRuns = (runs ?? []).filter((r) => r.status === 'draft' && !r.isArchived);
  const selectedRun = runs?.find((r) => r.id === selectedRunId) ?? null;

  return (
    <div className="min-h-screen bg-sand-50 px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-ink-900">Timesheet</h1>
          <p className="mt-1 text-sm text-ink-500">
            Record attendance per cutoff, then submit to lock it for payroll
          </p>
        </div>

        {selectedRun ? (
          <div className="space-y-4">
            <div>
              <button
                onClick={() => setSelectedRunId(null)}
                className="text-sm font-semibold text-teal-700 hover:underline"
              >
                ← Back to payroll runs
              </button>
              <h3 className="mt-1 text-lg font-bold text-ink-900">{selectedRun.cutoffLabel}</h3>
              <p className="text-sm text-ink-500">
                {formatDate(selectedRun.payPeriodStart)} – {formatDate(selectedRun.payPeriodEnd)}
              </p>
            </div>
            <TimesheetGrid run={selectedRun} onSubmitted={refetch} />
          </div>
        ) : (
          <>
            {loading && <LoadingState label="Loading payroll runs…" />}
            {!loading && error && <ErrorState message={error} onRetry={refetch} />}
            {!loading && !error && <RunPicker runs={draftRuns} onPick={setSelectedRunId} />}
          </>
        )}
      </div>
    </div>
  );
}