import { useState } from 'react';
import { Plus, LineChart, Check, X as XIcon, ClipboardEdit, CheckCircle2 } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { DataTable, type Column } from '../components/common/DataTable';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingState, ErrorState } from '../components/common/LoadError';
import { StatusBadge } from '../components/common/StatusBadge';
import { StatCard } from '../components/common/StatCard';
import { Modal } from '../components/common/Modal';
import { TextField, SelectField, TextAreaField } from '../components/common/FormField';
import { EmployeePicker } from '../components/common/EmployeePicker';
import { useApiResource } from '../hooks/useApiResource';
import { useCurrentUser, isAdmin } from '../hooks/useCurrentUser';
import { compensationService } from '../services/compensation.service';
import type { SalaryGrade, CompensationAdjustment, AdjustmentType } from '../types';
import { formatCurrency, formatDate } from '../utils/format';

const ADJUSTMENT_TYPE_LABEL: Record<AdjustmentType, string> = {
  merit_increase: 'Merit increase',
  promotion: 'Promotion',
  market_adjustment: 'Market adjustment',
  annual_increment: 'Annual increment',
};

function NewGradeModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    gradeCode: '',
    gradeName: '',
    minSalary: '',
    midSalary: '',
    maxSalary: '',
    applicablePositions: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await compensationService.createSalaryGrade({
        gradeCode: form.gradeCode,
        gradeName: form.gradeName,
        minSalary: Number(form.minSalary),
        midSalary: Number(form.midSalary),
        maxSalary: Number(form.maxSalary),
        applicablePositions: form.applicablePositions,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the salary grade.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Add salary grade" onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Grade code"
            placeholder="e.g. SG-08"
            required
            value={form.gradeCode}
            onChange={(e) => setForm({ ...form, gradeCode: e.target.value })}
          />
          <TextField
            label="Grade name"
            placeholder="e.g. Senior Associate"
            required
            value={form.gradeName}
            onChange={(e) => setForm({ ...form, gradeName: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <TextField
            label="Min salary"
            type="number"
            required
            value={form.minSalary}
            onChange={(e) => setForm({ ...form, minSalary: e.target.value })}
          />
          <TextField
            label="Mid salary"
            type="number"
            required
            value={form.midSalary}
            onChange={(e) => setForm({ ...form, midSalary: e.target.value })}
          />
          <TextField
            label="Max salary"
            type="number"
            required
            value={form.maxSalary}
            onChange={(e) => setForm({ ...form, maxSalary: e.target.value })}
          />
        </div>
        <TextField
          label="Applicable positions"
          placeholder="e.g. Marketing Specialist, Accountant"
          required
          value={form.applicablePositions}
          onChange={(e) => setForm({ ...form, applicablePositions: e.target.value })}
        />
        {error && <p className="text-sm text-bad-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-ink-500 hover:bg-sand-100">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Save grade'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function NewAdjustmentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    employeeId: '',
    employeeName: '',
    adjustmentType: 'merit_increase' as AdjustmentType,
    currentSalary: '',
    proposedSalary: '',
    effectiveDate: '',
    justification: '',
    requestedBy: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await compensationService.createAdjustment({
        employeeId: form.employeeId,
        employeeName: form.employeeName,
        adjustmentType: form.adjustmentType,
        currentSalary: Number(form.currentSalary),
        proposedSalary: Number(form.proposedSalary),
        effectiveDate: form.effectiveDate,
        justification: form.justification,
        requestedBy: form.requestedBy,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit the adjustment request.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Request compensation adjustment" onClose={onClose} width="lg">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <EmployeePicker
          required
          value={form.employeeId}
          onChange={(emp) =>
            setForm({
              ...form,
              employeeId: emp?.id ?? '',
              employeeName: emp ? `${emp.firstName} ${emp.lastName}` : '',
              currentSalary: emp ? String(emp.baseSalary) : form.currentSalary,
            })
          }
        />
        <div className="grid grid-cols-2 gap-4">
          <SelectField
            label="Adjustment type"
            required
            value={form.adjustmentType}
            onChange={(e) => setForm({ ...form, adjustmentType: e.target.value as AdjustmentType })}
          >
            {Object.entries(ADJUSTMENT_TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Effective date"
            type="date"
            required
            value={form.effectiveDate}
            onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Current salary"
            type="number"
            required
            value={form.currentSalary}
            onChange={(e) => setForm({ ...form, currentSalary: e.target.value })}
          />
          <TextField
            label="Proposed salary"
            type="number"
            required
            value={form.proposedSalary}
            onChange={(e) => setForm({ ...form, proposedSalary: e.target.value })}
          />
        </div>
        <TextField
          label="Requested by"
          required
          value={form.requestedBy}
          onChange={(e) => setForm({ ...form, requestedBy: e.target.value })}
        />
        <TextAreaField
          label="Justification"
          required
          value={form.justification}
          onChange={(e) => setForm({ ...form, justification: e.target.value })}
        />
        {error && <p className="text-sm text-bad-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-ink-500 hover:bg-sand-100">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit request'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function SalaryGradesTab() {
  const { data: currentUser } = useCurrentUser();
  const canManage = isAdmin(currentUser);
  const { data, loading, error, refetch } = useApiResource(() => compensationService.listSalaryGrades(), []);
  const [showNew, setShowNew] = useState(false);

  const columns: Column<SalaryGrade>[] = [
    { header: 'Grade', render: (r) => <span className="font-medium">{r.gradeCode}</span> },
    { header: 'Name', render: (r) => r.gradeName },
    { header: 'Min', render: (r) => formatCurrency(r.minSalary), align: 'right' },
    { header: 'Mid', render: (r) => formatCurrency(r.midSalary), align: 'right' },
    { header: 'Max', render: (r) => formatCurrency(r.maxSalary), align: 'right' },
    { header: 'Applicable positions', render: (r) => r.applicablePositions },
  ];

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <button
            onClick={() => setShowNew(true)}
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
          >
            <Plus size={16} /> Add salary grade
          </button>
        </div>
      )}
      {loading && <LoadingState label="Loading salary grades…" />}
      {!loading && error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && (!data || data.length === 0) && (
        <EmptyState
          icon={LineChart}
          title="No salary grades defined"
          description="Set up salary grades to structure compensation ranges across positions."
          actionLabel={canManage ? 'Add salary grade' : undefined}
          onAction={canManage ? () => setShowNew(true) : undefined}
        />
      )}
      {!loading && !error && data && data.length > 0 && (
        <DataTable columns={columns} rows={data} rowKey={(r) => r.id} />
      )}
      {showNew && <NewGradeModal onClose={() => setShowNew(false)} onCreated={refetch} />}
    </div>
  );
}

function AdjustmentsTab() {
  const { data: currentUser } = useCurrentUser();
  const canDecide = isAdmin(currentUser);
  const { data, loading, error, refetch } = useApiResource(() => compensationService.listAdjustments(), []);
  const [showNew, setShowNew] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function decide(id: string, status: 'approved' | 'rejected') {
    setBusyId(id);
    try {
      await compensationService.decideAdjustment(id, status);
      refetch();
    } finally {
      setBusyId(null);
    }
  }

  const columns: Column<CompensationAdjustment>[] = [
    { header: 'Employee', render: (r) => <span className="font-medium">{r.employeeName}</span> },
    { header: 'Type', render: (r) => ADJUSTMENT_TYPE_LABEL[r.adjustmentType] },
    { header: 'Current', render: (r) => formatCurrency(r.currentSalary), align: 'right' },
    { header: 'Proposed', render: (r) => formatCurrency(r.proposedSalary), align: 'right' },
    { header: 'Effective', render: (r) => formatDate(r.effectiveDate) },
    { header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      header: '',
      render: (r) =>
        r.status === 'pending' && canDecide ? (
          <div className="flex justify-end gap-2">
            <button
              disabled={busyId === r.id}
              onClick={() => decide(r.id, 'approved')}
              className="rounded-lg bg-good-100 p-1.5 text-good-600 transition hover:bg-good-100/70 disabled:opacity-50"
              aria-label="Approve"
            >
              <Check size={16} />
            </button>
            <button
              disabled={busyId === r.id}
              onClick={() => decide(r.id, 'rejected')}
              className="rounded-lg bg-bad-100 p-1.5 text-bad-600 transition hover:bg-bad-100/70 disabled:opacity-50"
              aria-label="Reject"
            >
              <XIcon size={16} />
            </button>
          </div>
        ) : null,
      align: 'right',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          <Plus size={16} /> Request adjustment
        </button>
      </div>
      {loading && <LoadingState label="Loading adjustment requests…" />}
      {!loading && error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && (!data || data.length === 0) && (
        <EmptyState
          icon={LineChart}
          title="No adjustment requests"
          description="Merit increases, promotions, and market adjustments will be listed here for review."
          actionLabel="Request adjustment"
          onAction={() => setShowNew(true)}
        />
      )}
      {!loading && !error && data && data.length > 0 && (
        <DataTable columns={columns} rows={data} rowKey={(r) => r.id} />
      )}
      {showNew && <NewAdjustmentModal onClose={() => setShowNew(false)} onCreated={refetch} />}
    </div>
  );
}

export function CompensationPlanning() {
  const [tab, setTab] = useState<'grades' | 'adjustments'>('grades');
  const { data: grades } = useApiResource(() => compensationService.listSalaryGrades(), []);
  const { data: adjustments } = useApiResource(() => compensationService.listAdjustments(), []);

  const pendingCount = (adjustments ?? []).filter((a) => a.status === 'pending').length;
  const implementedCount = (adjustments ?? []).filter((a) => a.status === 'implemented').length;

  return (
    <Layout title="Compensation Planning" subtitle="Grades, structures &amp; adjustments">
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={LineChart} label="Salary Grades" value={String((grades ?? []).length)} tone="primary" hint="Active bands" />
        <StatCard icon={ClipboardEdit} label="Pending Adjustments" value={String(pendingCount)} tone="clay" hint="Awaiting approval" />
        <StatCard icon={CheckCircle2} label="Implemented (YTD)" value={String(implementedCount)} tone="good" hint="Salary changes applied" />
      </div>

      <div className="mb-4 flex w-fit rounded-lg border border-line bg-surface p-1">
        {(
          [
            { key: 'grades', label: 'Salary Grades' },
            { key: 'adjustments', label: 'Adjustment Requests' },
          ] as const
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
              tab === t.key ? 'bg-primary-600 text-white' : 'text-ink-500 hover:bg-sand-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'grades' ? <SalaryGradesTab /> : <AdjustmentsTab />}
    </Layout>
  );
}
