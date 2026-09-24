import { useState } from 'react';
import { Plus, Banknote, FileSpreadsheet, ClipboardList, Calculator, CheckCircle2, Send, Mail, MessageSquare, Archive, ArchiveRestore, Trash2, AlertTriangle } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { DataTable, type Column } from '../components/common/DataTable';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingState, ErrorState } from '../components/common/LoadError';
import { StatusBadge } from '../components/common/StatusBadge';
import { Modal } from '../components/common/Modal';
import { TextField } from '../components/common/FormField';
import { PayslipDocument } from '../components/payroll/PayslipDocument';
import { AnomalyPanel } from '../components/payroll/AnomalyPanel';
import { useApiResource } from '../hooks/useApiResource';
import { useCurrentUser, isAdmin } from '../hooks/useCurrentUser';
import { payrollService } from '../services/payroll.service';
import type { PayrollRun, Payslip, AttendanceSummary, AttendanceSheetRow } from '../types';
import { formatCurrency, formatDate } from '../utils/format';

/** "⚠️ X anomalies detected" — shared by the run list and the run detail view. */
function AnomalyBadge({ count, onClick }: { count: number; onClick: () => void }) {
  if (count <= 0) return null;
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full bg-clay-100 px-2.5 py-1 text-xs font-semibold text-clay-600 transition hover:bg-clay-100/70"
    >
      <AlertTriangle size={13} />
      {count} {count === 1 ? 'anomaly' : 'anomalies'} detected
    </button>
  );
}

function NewRunModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ payPeriodStart: '', payPeriodEnd: '', payDate: '', cutoffLabel: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await payrollService.createRun(form);
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the payroll run.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Start new payroll run" onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <TextField
          label="Cutoff label"
          placeholder="e.g. May 1–15, 2026"
          required
          value={form.cutoffLabel}
          onChange={(e) => setForm({ ...form, cutoffLabel: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Pay period start"
            type="date"
            required
            value={form.payPeriodStart}
            onChange={(e) => setForm({ ...form, payPeriodStart: e.target.value })}
          />
          <TextField
            label="Pay period end"
            type="date"
            required
            value={form.payPeriodEnd}
            onChange={(e) => setForm({ ...form, payPeriodEnd: e.target.value })}
          />
        </div>
        <TextField
          label="Pay date"
          type="date"
          required
          value={form.payDate}
          onChange={(e) => setForm({ ...form, payDate: e.target.value })}
        />
        {error && <p className="text-sm text-bad-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-ink-500 hover:bg-sand-100">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create run'}
          </button>
        </div>
      </form>
    </Modal>
  );
}


function AttendanceRecordsPanel({ run }: { run: PayrollRun }) {
  const { data, loading, error, refetch } = useApiResource<AttendanceSheetRow[]>(
    () => payrollService.listAttendanceRecords(run.id),
    [run.id]
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { status: string; minutesLate: number; overtimeMinutes: number }>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  function dayKey(employeeId: string, date: string) {
    return `${employeeId}__${date}`;
  }

  function draftFor(day: AttendanceRecord) {
    const key = dayKey(day.employeeId, day.date);
    return drafts[key] ?? { status: day.status ?? 'present', minutesLate: day.minutesLate, overtimeMinutes: day.overtimeMinutes };
  }

  function updateDraft(day: AttendanceRecord, field: 'status' | 'minutesLate' | 'overtimeMinutes', value: string | number) {
    if (day.isLocked) return;
    const key = dayKey(day.employeeId, day.date);
    setDrafts((prev) => ({ ...prev, [key]: { ...draftFor(day), [field]: value } }));
  }

  async function saveDay(day: AttendanceRecord) {
    if (day.isLocked) return;
    const key = dayKey(day.employeeId, day.date);
    const draft = draftFor(day);
    setSavingKey(key);
    setSaveError(null);
    try {
      await payrollService.saveAttendanceRecord(run.id, {
        employeeId: day.employeeId,
        date: day.date,
        status: draft.status as 'present' | 'absent' | 'day_off',
        minutesLate: draft.minutesLate,
        overtimeMinutes: draft.overtimeMinutes,
      });
      await refetch();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save this day.');
    } finally {
      setSavingKey(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-teal-100/40 p-4 text-sm text-ink-900">
        <p className="font-semibold">Daily attendance (DTR)</p>
        <p className="mt-1 text-ink-500">
          Click an employee to record attendance day by day. Once a day is saved it is locked and can no longer be
          changed — this keeps the attendance record tamper-proof.
        </p>
      </div>

      {loading && <LoadingState label="Loading employees…" />}
      {!loading && error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && (!data || data.length === 0) && (
        <EmptyState
          icon={ClipboardList}
          title="No active employees"
          description="Add active employees in the Employees module before recording attendance."
        />
      )}
      {!loading && !error && data && data.length > 0 && (
        <div className="space-y-2">
          {saveError && <p className="text-sm text-bad-600">{saveError}</p>}
          {data.map((row) => {
            const isOpen = expandedId === row.employeeId;
            const lockedCount = row.days.filter((d) => d.isLocked).length;
            return (
              <div key={row.employeeId} className="overflow-hidden rounded-xl border border-line bg-surface">
                <button
                  onClick={() => setExpandedId(isOpen ? null : row.employeeId)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-sand-50/60"
                >
                  <span className="font-medium text-ink-900">{row.employeeName}</span>
                  <span className="text-xs text-ink-500">
                    {lockedCount} / {row.days.length} days saved
                  </span>
                </button>
                {isOpen && (
                  <div className="border-t border-line">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-line bg-sand-50/70">
                          <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Date</th>
                          <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Status</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-ink-500">Late (min)</th>
                          <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-ink-500">OT (min)</th>
                          <th className="px-4 py-2" />
                        </tr>
                      </thead>
                      <tbody>
                        {row.days.map((day) => {
                          const key = dayKey(day.employeeId, day.date);
                          const draft = draftFor(day);
                          return (
                            <tr key={key} className="border-b border-line last:border-0">
                              <td className="px-4 py-2 text-ink-900">{formatDate(day.date)}</td>
                              <td className="px-4 py-2">
                                <select
                                  value={draft.status}
                                  disabled={day.isLocked}
                                  onChange={(e) => updateDraft(day, 'status', e.target.value)}
                                  className="rounded-lg border border-line px-2 py-1 text-sm outline-none focus:border-teal-500 disabled:cursor-not-allowed disabled:bg-sand-50 disabled:text-ink-300"
                                >
                                  <option value="present">Present</option>
                                  <option value="absent">Absent</option>
                                  <option value="day_off">Day off</option>
                                </select>
                              </td>
                              <td className="px-4 py-2 text-right">
                                <input
                                  type="number"
                                  min={0}
                                  value={draft.minutesLate}
                                  disabled={day.isLocked}
                                  onChange={(e) => updateDraft(day, 'minutesLate', Number(e.target.value))}
                                  className="w-20 rounded-lg border border-line px-2 py-1 text-right text-sm outline-none focus:border-teal-500 disabled:cursor-not-allowed disabled:bg-sand-50 disabled:text-ink-300"
                                />
                              </td>
                              <td className="px-4 py-2 text-right">
                                <input
                                  type="number"
                                  min={0}
                                  value={draft.overtimeMinutes}
                                  disabled={day.isLocked}
                                  onChange={(e) => updateDraft(day, 'overtimeMinutes', Number(e.target.value))}
                                  className="w-20 rounded-lg border border-line px-2 py-1 text-right text-sm outline-none focus:border-teal-500 disabled:cursor-not-allowed disabled:bg-sand-50 disabled:text-ink-300"
                                />
                              </td>
                              <td className="px-4 py-2 text-right">
                                {day.isLocked ? (
                                  <span className="rounded-full bg-sand-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                                    Locked
                                  </span>
                                ) : savingKey === key ? (
                                  <span className="text-xs text-ink-300">Saving…</span>
                                ) : (
                                  <button
                                    onClick={() => saveDay(day)}
                                    className="rounded-lg bg-navy-900 px-3 py-1 text-xs font-semibold text-white transition hover:bg-navy-800"
                                  >
                                    Save
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Cutoff-level adjustments (cash advance, tax refund, SL-cash conversion)
 * plus the Compute button. This still uses the old AttendanceSummary
 * table — unchanged from before.
 */
function AttendanceAdjustmentsPanel({ run, onComputed }: { run: PayrollRun; onComputed: () => void }) {
  const { data, loading, error, refetch } = useApiResource<AttendanceSummary[]>(
    () => payrollService.listAttendance(run.id),
    [run.id]
  );
  const [rows, setRows] = useState<Record<string, AttendanceSummary>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [computing, setComputing] = useState(false);
  const [computeError, setComputeError] = useState<string | null>(null);

  const list = data ? data.map((r) => rows[r.employeeId] ?? r) : [];

  function updateField(row: AttendanceSummary, field: keyof AttendanceSummary, value: number) {
    if (row.isLocked) return;
    setRows((prev) => ({ ...prev, [row.employeeId]: { ...row, ...prev[row.employeeId], [field]: value } }));
  }

  async function saveRow(row: AttendanceSummary) {
    if (row.isLocked) return;
    setSavingId(row.employeeId);
    try {
      await payrollService.saveAttendance(run.id, {
        employeeId: row.employeeId,
        daysPresent: row.daysPresent,
        lateMinutes: row.lateMinutes,
        overtimeHours: row.overtimeHours,
        unpaidAbsenceDays: row.unpaidAbsenceDays,
        cashAdvance: row.cashAdvance,
        taxRefund: row.taxRefund,
        slCashConversion: row.slCashConversion,
      });
      refetch();
    } finally {
      setSavingId(null);
    }
  }

  async function handleCompute() {
    setComputing(true);
    setComputeError(null);
    try {
      await Promise.all(list.map((row) => saveRow(row)));
      await payrollService.computeRun(run.id);
      onComputed();
    } catch (err) {
      setComputeError(err instanceof Error ? err.message : 'Could not compute this payroll run.');
    } finally {
      setComputing(false);
    }
  }

  function numberField(r: AttendanceSummary, field: keyof AttendanceSummary, opts: { min?: number; max?: number; step?: number; width?: string } = {}) {
    return (
      <input
        type="number"
        min={opts.min ?? 0}
        max={opts.max}
        step={opts.step ?? 1}
        value={r[field] as number}
        disabled={r.isLocked}
        onChange={(e) => updateField(r, field, Number(e.target.value))}
        onBlur={() => saveRow(rows[r.employeeId] ?? r)}
        className={`${opts.width ?? 'w-20'} rounded-lg border border-line px-2 py-1 text-right text-sm outline-none focus:border-teal-500 disabled:cursor-not-allowed disabled:bg-sand-50 disabled:text-ink-300`}
      />
    );
  }

  const columns: Column<AttendanceSummary>[] = [
    {
      header: 'Employee',
      render: (r) => (
        <div className="flex items-center gap-2">
          <span className="font-medium">{r.employeeName}</span>
          {r.isLocked && (
            <span className="rounded-full bg-sand-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-500">
              Locked
            </span>
          )}
        </div>
      ),
    },
    { header: 'Cash advance', render: (r) => numberField(r, 'cashAdvance', { step: 0.01, width: 'w-24' }), align: 'right' },
    { header: 'Tax refund', render: (r) => numberField(r, 'taxRefund', { step: 0.01, width: 'w-24' }), align: 'right' },
    { header: 'SL - Cash conversion', render: (r) => numberField(r, 'slCashConversion', { step: 0.01, width: 'w-24' }), align: 'right' },
    {
      header: '',
      render: (r) => (savingId === r.employeeId ? <span className="text-xs text-ink-300">Saving…</span> : null),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-sand-100/40 p-4 text-sm text-ink-900">
        <p className="font-semibold">Cutoff adjustments</p>
        <p className="mt-1 text-ink-500">
           One-off amounts for this cutoff — cash advance, tax refund, SL-cash conversion. Days present, late, and
          overtime come from the recorded attendance.
        </p>
      </div>

      {loading && <LoadingState label="Loading employees…" />}
      {!loading && error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && list.length === 0 && (
        <EmptyState
          icon={ClipboardList}
          title="No active employees"
          description="Add active employees in the Employees module before computing this payroll run."
        />
      )}
      {!loading && !error && list.length > 0 && (
        <>
          <DataTable columns={columns} rows={list} rowKey={(r) => r.employeeId} />
          {computeError && <p className="text-sm text-bad-600">{computeError}</p>}
          <div className="flex justify-end">
            <button
              onClick={handleCompute}
              disabled={computing}
              className="flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-50"
            >
              <Calculator size={16} />
              {computing ? 'Computing…' : 'Compute payroll'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * NEW: read-only Review Breakdown, shown once every employee's attendance
 * for this cutoff is fully saved (all days locked). This replaces the
 * editable DTR + adjustments panels — nothing here can be edited, matching
 * "hindi na siya pwede ma-edit" once attendance encoding is done.
 *
 * Sections: Attendance, Deductions, Claims (per the whiteboard sketch) —
 * add more sections here the same way as the payroll model grows.
 */
function ReviewBreakdownPanel({ run, onComputed }: { run: PayrollRun; onComputed: () => void }) {
  const { data: attendanceRows, loading: attLoading, error: attError } = useApiResource<AttendanceSheetRow[]>(
    () => payrollService.listAttendanceRecords(run.id),
    [run.id]
  );
  const { data: adjustments, loading: adjLoading, error: adjError } = useApiResource<AttendanceSummary[]>(
    () => payrollService.listAttendance(run.id),
    [run.id]
  );
  const [openSection, setOpenSection] = useState<string | null>('attendance');
  const [computing, setComputing] = useState(false);
  const [computeError, setComputeError] = useState<string | null>(null);

  const periodLabel = `${formatDate(run.payPeriodStart)} – ${formatDate(run.payPeriodEnd)}`;

  function toggle(section: string) {
    setOpenSection((prev) => (prev === section ? null : section));
  }

  async function handleCompute() {
    setComputing(true);
    setComputeError(null);
    try {
      await payrollService.computeRun(run.id);
      onComputed();
    } catch (err) {
      setComputeError(err instanceof Error ? err.message : 'Could not compute this payroll run.');
    } finally {
      setComputing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-line bg-teal-100/40 p-4 text-sm text-ink-900">
        <p className="font-semibold">Review breakdown</p>
        <p className="mt-1 text-ink-500">
          Attendance for this cutoff is fully recorded and locked. Review the breakdown below before computing
          payroll — none of it can be edited from here.
        </p>
      </div>

      {/* Attendance */}
      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <button
          onClick={() => toggle('attendance')}
          className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-sand-50/60"
        >
          <span className="font-semibold text-ink-900">Attendance</span>
          <span className="text-xs text-ink-500">{periodLabel}</span>
        </button>
        {openSection === 'attendance' && (
          <div className="border-t border-line">
            {attLoading && <LoadingState label="Loading attendance…" />}
            {!attLoading && attError && <ErrorState message={attError} />}
            {!attLoading && !attError && attendanceRows && attendanceRows.length > 0 && (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-sand-50/70">
                    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Employee</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-ink-500">Present</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-ink-500">Absent</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-ink-500">Day off</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-ink-500">Late (min)</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-ink-500">OT (min)</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRows.map((row) => {
                    const present = row.days.filter((d) => d.status === 'present').length;
                    const absent = row.days.filter((d) => d.status === 'absent').length;
                    const dayOff = row.days.filter((d) => d.status === 'day_off').length;
                    const late = row.days.reduce((sum, d) => sum + d.minutesLate, 0);
                    const ot = row.days.reduce((sum, d) => sum + d.overtimeMinutes, 0);
                    return (
                      <tr key={row.employeeId} className="border-b border-line last:border-0">
                        <td className="px-4 py-2 font-medium text-ink-900">{row.employeeName}</td>
                        <td className="px-4 py-2 text-right text-ink-900">{present}</td>
                        <td className="px-4 py-2 text-right text-ink-900">{absent}</td>
                        <td className="px-4 py-2 text-right text-ink-900">{dayOff}</td>
                        <td className="px-4 py-2 text-right text-ink-900">{late}</td>
                        <td className="px-4 py-2 text-right text-ink-900">{ot}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Deductions */}
      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <button
          onClick={() => toggle('deductions')}
          className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-sand-50/60"
        >
          <span className="font-semibold text-ink-900">Deductions</span>
          <span className="text-xs text-ink-500">{periodLabel}</span>
        </button>
        {openSection === 'deductions' && (
          <div className="border-t border-line">
            {adjLoading && <LoadingState label="Loading deductions…" />}
            {!adjLoading && adjError && <ErrorState message={adjError} />}
            {!adjLoading && !adjError && adjustments && adjustments.length > 0 && (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-sand-50/70">
                    <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-ink-500">Employee</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-ink-500">Cash advance</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-ink-500">Tax refund</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wide text-ink-500">SL - Cash conversion</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustments.map((r) => (
                    <tr key={r.employeeId} className="border-b border-line last:border-0">
                      <td className="px-4 py-2 font-medium text-ink-900">{r.employeeName}</td>
                      <td className="px-4 py-2 text-right text-ink-900">{formatCurrency(r.cashAdvance)}</td>
                      <td className="px-4 py-2 text-right text-ink-900">{formatCurrency(r.taxRefund)}</td>
                      <td className="px-4 py-2 text-right text-ink-900">{formatCurrency(r.slCashConversion)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Claims — TODO: wire this up once there's a per-run claims/reimbursement
          endpoint (e.g. payrollService.listClaimsForRun(run.id)); leaving the
          section here so the layout matches the sketch. */}
      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <button
          onClick={() => toggle('claims')}
          className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-sand-50/60"
        >
          <span className="font-semibold text-ink-900">Claims</span>
          <span className="text-xs text-ink-500">{periodLabel}</span>
        </button>
        {openSection === 'claims' && (
          <div className="border-t border-line px-4 py-6 text-sm text-ink-500">
            Claims &amp; reimbursement figures for this cutoff aren't wired into this view yet.
          </div>
        )}
      </div>

      {computeError && <p className="text-sm text-bad-600">{computeError}</p>}
      <div className="flex justify-end">
        <button
          onClick={handleCompute}
          disabled={computing}
          className="flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-50"
        >
          <Calculator size={16} />
          {computing ? 'Computing…' : 'Compute payroll'}
        </button>
      </div>
    </div>
  );
}



function SendChannelMenu({
  onSend,
  disabled,
}: {
  onSend: (channel: 'email' | 'sms') => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink-900 transition hover:bg-sand-100 disabled:opacity-50"
      >
        <Send size={13} />
        Send
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-lg border border-line bg-surface shadow-lg">
          <button
            onClick={() => {
              onSend('email');
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-ink-900 hover:bg-sand-50"
          >
            <Mail size={13} /> Via Email
          </button>
          <button
            onClick={() => {
              onSend('sms');
              setOpen(false);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium text-ink-900 hover:bg-sand-50"
          >
            <MessageSquare size={13} /> Via SMS
          </button>
        </div>
      )}
    </div>
  );
}

function PayslipsPanel({ run, onRunUpdated }: { run: PayrollRun; onRunUpdated: () => void }) {
  const { data: currentUser } = useCurrentUser();
  const canApproveOrRelease = isAdmin(currentUser);
  const { data, loading, error, refetch } = useApiResource<Payslip[]>(
    () => payrollService.listPayslips(run.id),
    [run.id]
  );
  const [busy, setBusy] = useState(false);
  const [viewingPayslip, setViewingPayslip] = useState<Payslip | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [bulkSending, setBulkSending] = useState(false);
  const [sendNotice, setSendNotice] = useState<string | null>(null);
  const [showAnomalies, setShowAnomalies] = useState(false);
  const [approveError, setApproveError] = useState<string | null>(null);

  const allSelected = !!data && data.length > 0 && selectedIds.size === data.length;

  function toggleAll() {
    if (!data) return;
    setSelectedIds(allSelected ? new Set() : new Set(data.map((p) => p.id)));
  }

  function toggleOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleApprove() {
    setBusy(true);
    setApproveError(null);
    try {
      await payrollService.approveRun(run.id);
      onRunUpdated();
    } catch (err) {
      setApproveError(err instanceof Error ? err.message : 'Could not approve this payroll run.');
    } finally {
      setBusy(false);
    }
  }

  async function handleRelease() {
    setBusy(true);
    try {
      const { emailSummary } = await payrollService.releaseRun(run.id);
      onRunUpdated();
      refetch();
      setSendNotice(
        emailSummary.emailed > 0
          ? `Payslips released. Automatically emailed ${emailSummary.emailed} active employee${emailSummary.emailed === 1 ? '' : 's'}${emailSummary.failed ? `, ${emailSummary.failed} failed` : ''}.`
          : 'Payslips released. No active employees with an email on file to send to.'
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleSendOne(payslip: Payslip, channel: 'email' | 'sms') {
    setSendingId(payslip.id);
    setSendNotice(null);
    try {
      const result = await payrollService.sendPayslip(payslip.id, channel);
      setSendNotice(result.message);
      refetch();
    } catch (err) {
      setSendNotice(err instanceof Error ? err.message : 'Could not send this payslip.');
    } finally {
      setSendingId(null);
    }
  }

  async function handleSendBulk(channel: 'email' | 'sms') {
    if (selectedIds.size === 0) return;
    setBulkSending(true);
    setSendNotice(null);
    try {
      const result = await payrollService.sendPayslipsBulk(run.id, Array.from(selectedIds), channel);
      setSendNotice(`Sent to ${result.sent} employee${result.sent === 1 ? '' : 's'}${result.failed ? `, ${result.failed} failed` : ''}.`);
      setSelectedIds(new Set());
      refetch();
    } catch (err) {
      setSendNotice(err instanceof Error ? err.message : 'Could not send the selected payslips.');
    } finally {
      setBulkSending(false);
    }
  }

  return (
    <div className="space-y-4">
      {run.unresolvedAnomaliesCount > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-clay-100 bg-clay-100/30 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-ink-900">
            <AlertTriangle size={16} className="text-clay-600" />
            AI anomaly scan flagged {run.unresolvedAnomaliesCount} item(s) on this run
            {run.blockingAnomaliesCount > 0 && (
              <span className="font-semibold text-bad-600"> — {run.blockingAnomaliesCount} blocking approval</span>
            )}
            .
          </div>
          <AnomalyBadge count={run.unresolvedAnomaliesCount} onClick={() => setShowAnomalies(true)} />
        </div>
      )}

      {loading && <LoadingState label="Loading payslips…" />}
      {!loading && error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && (!data || data.length === 0) && (
        <EmptyState
          icon={FileSpreadsheet}
          title="No payslips yet"
          description="Payslips will appear here once this payroll run has been computed."
        />
      )}
      {!loading && !error && data && data.length > 0 && (
        <>
          {sendNotice && (
            <div className="rounded-lg border border-line bg-teal-100/40 px-4 py-2.5 text-sm text-ink-900">
              {sendNotice}
            </div>
          )}

          {selectedIds.size > 0 && (
            <div className="flex items-center justify-between rounded-lg border border-line bg-sand-50 px-4 py-2.5">
              <span className="text-sm font-medium text-ink-900">{selectedIds.size} selected</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSendBulk('email')}
                  disabled={bulkSending}
                  className="flex items-center gap-1.5 rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-navy-800 disabled:opacity-50"
                >
                  <Mail size={13} /> {bulkSending ? 'Sending…' : 'Send via Email'}
                </button>
                <button
                  onClick={() => handleSendBulk('sms')}
                  disabled={bulkSending}
                  className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-900 transition hover:bg-sand-100 disabled:opacity-50"
                >
                  <MessageSquare size={13} /> {bulkSending ? 'Sending…' : 'Send via SMS'}
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-sm">
            <table className="w-full min-w-max text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-sand-50/70">
                  <th className="w-10 px-5 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Select all payslips"
                      className="h-4 w-4 rounded border-line"
                    />
                  </th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-500">Employee</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-500">Department</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-500">Total salary</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-500">Deductions</th>
                  <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-500">Total remittance</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-500">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-ink-500">Sent</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.map((r) => (
                  <tr key={r.id} className="border-b border-line last:border-0 hover:bg-sand-50/60">
                    <td className="px-5 py-3.5">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(r.id)}
                        onChange={() => toggleOne(r.id)}
                        aria-label={`Select ${r.employeeName}`}
                        className="h-4 w-4 rounded border-line"
                      />
                    </td>
                    <td className="px-5 py-3.5 font-medium text-ink-900">{r.employeeName}</td>
                    <td className="px-5 py-3.5 text-ink-900">{r.department}</td>
                    <td className="px-5 py-3.5 text-right text-ink-900">{formatCurrency(r.totalSalary)}</td>
                    <td className="px-5 py-3.5 text-right text-ink-900">{formatCurrency(r.totalSalary - r.netSalary)}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-ink-900">{formatCurrency(r.totalRemittance)}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-5 py-3.5 text-xs text-ink-500">
                      {r.emailSentAt && <div>✓ Emailed</div>}
                      {r.smsSentAt && <div>✓ Texted</div>}
                      {!r.emailSentAt && !r.smsSentAt && '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setViewingPayslip(r)}
                          className="text-sm font-semibold text-teal-700 hover:underline"
                        >
                          View
                        </button>
                        <SendChannelMenu
                          disabled={sendingId === r.id}
                          onSend={(channel) => handleSendOne(r, channel)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {canApproveOrRelease && (
            <div className="flex flex-col items-end gap-2">
              {approveError && <p className="text-sm text-bad-600">{approveError}</p>}
              <div className="flex items-center gap-3">
                {run.status === 'for_approval' && run.blockingAnomaliesCount > 0 && (
                  <p className="text-xs text-bad-600">
                    Resolve {run.blockingAnomaliesCount} blocking anomaly flag(s) before approving.
                  </p>
                )}
                {run.status === 'for_approval' && (
                  <button
                    onClick={handleApprove}
                    disabled={busy || run.blockingAnomaliesCount > 0}
                    title={run.blockingAnomaliesCount > 0 ? 'Dismiss or resolve the blocking anomaly flags first.' : undefined}
                    className="flex items-center gap-2 rounded-lg bg-good-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircle2 size={16} />
                    {busy ? 'Approving…' : 'Approve payroll run'}
                  </button>
                )}
                {run.status === 'approved' && (
                  <button
                    onClick={handleRelease}
                    disabled={busy}
                    className="flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-50"
                  >
                    <Send size={16} />
                    {busy ? 'Releasing…' : 'Release payslips'}
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {viewingPayslip && (
        <PayslipDocument payslip={viewingPayslip} run={run} onClose={() => setViewingPayslip(null)} />
      )}

      {showAnomalies && (
        <AnomalyPanel run={run} onClose={() => setShowAnomalies(false)} onChanged={onRunUpdated} />
      )}
    </div>
  );
}

export function PayrollManagement() {
  const { data: currentUser } = useCurrentUser();
  const canManageRuns = isAdmin(currentUser);
  const [tab, setTab] = useState<'active' | 'archived'>('active');
  const { data, loading, error, refetch } = useApiResource(
    () => payrollService.listRuns(tab === 'archived'),
    [tab]
  );
  const [showNewRun, setShowNewRun] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [anomalyRunId, setAnomalyRunId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const visibleRuns = data?.filter((r) => (tab === 'archived' ? r.isArchived : !r.isArchived)) ?? [];
  const selectedRun = data?.find((r) => r.id === selectedRunId) ?? null;
  const anomalyRun = data?.find((r) => r.id === anomalyRunId) ?? null;

  async function handleArchive(run: PayrollRun) {
    setBusyId(run.id);
    try {
      await payrollService.archiveRun(run.id);
      refetch();
    } finally {
      setBusyId(null);
    }
  }

  async function handleUnarchive(run: PayrollRun) {
    setBusyId(run.id);
    try {
      await payrollService.unarchiveRun(run.id);
      refetch();
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(run: PayrollRun) {
    if (!confirm(`Delete the draft payroll run "${run.cutoffLabel}"? This cannot be undone.`)) return;
    setBusyId(run.id);
    try {
      await payrollService.deleteRun(run.id);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not delete this payroll run.');
    } finally {
      setBusyId(null);
    }
  }

  const columns: Column<PayrollRun>[] = [
    { header: 'Cutoff', render: (r) => <span className="font-medium">{r.cutoffLabel}</span> },
    { header: 'Period', render: (r) => `${formatDate(r.payPeriodStart)} – ${formatDate(r.payPeriodEnd)}` },
    { header: 'Pay date', render: (r) => formatDate(r.payDate) },
    { header: 'Employees', render: (r) => r.totalEmployees, align: 'center' },
    { header: 'Total salary', render: (r) => formatCurrency(r.grossTotal), align: 'right' },
    { header: 'Total remittance', render: (r) => <span className="font-semibold">{formatCurrency(r.netTotal)}</span>, align: 'right' },
    { header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      header: 'Anomalies',
      render: (r) => <AnomalyBadge count={r.unresolvedAnomaliesCount} onClick={() => setAnomalyRunId(r.id)} />,
    },
    {
      header: '',
      render: (r) => (
        <div className="flex items-center justify-end gap-3">
          <button onClick={() => setSelectedRunId(r.id)} className="text-sm font-semibold text-teal-700 hover:underline">
              {r.status === 'draft' ? 'Generate payroll' : 'View payslips'}
          </button>
          {canManageRuns && (tab === 'active' ? (
            <>
              <button
                onClick={() => handleArchive(r)}
                disabled={busyId === r.id}
                className="rounded-lg p-1.5 text-ink-500 transition hover:bg-sand-100 disabled:opacity-40"
                title="Archive"
                aria-label="Archive"
              >
                <Archive size={15} />
              </button>
              {r.status === 'draft' && (
                <button
                  onClick={() => handleDelete(r)}
                  disabled={busyId === r.id}
                  className="rounded-lg p-1.5 text-ink-500 transition hover:bg-bad-100 hover:text-bad-600 disabled:opacity-40"
                  title="Delete draft"
                  aria-label="Delete draft"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => handleUnarchive(r)}
              disabled={busyId === r.id}
              className="rounded-lg p-1.5 text-ink-500 transition hover:bg-sand-100 disabled:opacity-40"
              title="Unarchive"
              aria-label="Unarchive"
            >
              <ArchiveRestore size={15} />
            </button>
          ))}
        </div>
      ),
      align: 'right',
    },
  ];

  return (
    <Layout title="Payroll Management" subtitle="Compute payroll and review payslips">
      {selectedRun ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <button onClick={() => setSelectedRunId(null)} className="text-sm font-semibold text-teal-700 hover:underline">
                ← Back to payroll runs
              </button>
              <h3 className="mt-1 text-lg font-bold text-ink-900">{selectedRun.cutoffLabel}</h3>
              <p className="text-sm text-ink-500">
                {formatDate(selectedRun.payPeriodStart)} – {formatDate(selectedRun.payPeriodEnd)} · Pay date{' '}
                {formatDate(selectedRun.payDate)}
              </p>
            </div>
            <StatusBadge status={selectedRun.status} />
          </div>

          {selectedRun.status === 'draft' ? (
            <AttendanceAdjustmentsPanel run={selectedRun} onComputed={refetch} />
          ) : (
            <PayslipsPanel run={selectedRun} onRunUpdated={refetch} />
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex w-fit rounded-lg border border-line bg-surface p-1">
              {(
                [
                  { key: 'active', label: 'Active' },
                  { key: 'archived', label: 'Archived' },
                ] as const
              ).map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
                    tab === t.key ? 'bg-navy-900 text-white' : 'text-ink-500 hover:bg-sand-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {tab === 'active' && (
              <button
                onClick={() => setShowNewRun(true)}
                className="flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800"
              >
                <Plus size={16} /> New payroll run
              </button>
            )}
          </div>

          {loading && <LoadingState label="Loading payroll runs…" />}
          {!loading && error && <ErrorState message={error} onRetry={refetch} />}
          {!loading && !error && visibleRuns.length === 0 && tab === 'active' && (
            <EmptyState
              icon={Banknote}
              title="No payroll runs yet"
              description="Start a new payroll run to compute salaries, deductions, and net pay for a cutoff period."
              actionLabel="New payroll run"
              onAction={() => setShowNewRun(true)}
            />
          )}
          {!loading && !error && visibleRuns.length === 0 && tab === 'archived' && (
            <EmptyState
              icon={Archive}
              title="No archived payroll runs"
              description="Runs you archive from the Active tab will appear here, kept for records without cluttering the main list."
            />
          )}
          {!loading && !error && visibleRuns.length > 0 && (
            <DataTable columns={columns} rows={visibleRuns} rowKey={(r) => r.id} />
          )}
        </div>
      )}

      {showNewRun && <NewRunModal onClose={() => setShowNewRun(false)} onCreated={refetch} />}

      {anomalyRun && (
        <AnomalyPanel run={anomalyRun} onClose={() => setAnomalyRunId(null)} onChanged={refetch} />
      )}
    </Layout>
  );
}