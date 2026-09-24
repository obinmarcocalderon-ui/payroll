import { useState } from 'react';
import { Plus, HeartPulse, Shield } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { DataTable, type Column } from '../components/common/DataTable';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingState, ErrorState } from '../components/common/LoadError';
import { Modal } from '../components/common/Modal';
import { TextField, SelectField } from '../components/common/FormField';
import { EmployeePicker } from '../components/common/EmployeePicker';
import { useApiResource } from '../hooks/useApiResource';
import { benefitsService } from '../services/benefits.service';
import type { BenefitPlan, BenefitEnrollment, BenefitPlanType } from '../types';
import { formatCurrency } from '../utils/format';

const PLAN_TYPE_LABEL: Record<BenefitPlanType, string> = {
  hmo: 'HMO',
  life_insurance: 'Life Insurance',
  retirement: 'Retirement',
  wellness: 'Wellness',
  other: 'Other',
};

function NewPlanModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    planName: '',
    provider: '',
    planType: 'hmo' as BenefitPlanType,
    coverageAmount: '',
    employerSharePercent: '',
    employeeSharePercent: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await benefitsService.createPlan({
        planName: form.planName,
        provider: form.provider,
        planType: form.planType,
        coverageAmount: Number(form.coverageAmount),
        employerSharePercent: Number(form.employerSharePercent),
        employeeSharePercent: Number(form.employeeSharePercent),
        isActive: true,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the benefit plan.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Add benefit plan" onClose={onClose} width="lg">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Plan name"
            required
            value={form.planName}
            onChange={(e) => setForm({ ...form, planName: e.target.value })}
          />
          <TextField
            label="Provider"
            required
            value={form.provider}
            onChange={(e) => setForm({ ...form, provider: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <SelectField
            label="Plan type"
            required
            value={form.planType}
            onChange={(e) => setForm({ ...form, planType: e.target.value as BenefitPlanType })}
          >
            {Object.entries(PLAN_TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Coverage amount"
            type="number"
            required
            value={form.coverageAmount}
            onChange={(e) => setForm({ ...form, coverageAmount: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Employer share (%)"
            type="number"
            required
            value={form.employerSharePercent}
            onChange={(e) => setForm({ ...form, employerSharePercent: e.target.value })}
          />
          <TextField
            label="Employee share (%)"
            type="number"
            required
            value={form.employeeSharePercent}
            onChange={(e) => setForm({ ...form, employeeSharePercent: e.target.value })}
          />
        </div>
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
            {submitting ? 'Saving…' : 'Save plan'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function NewEnrollmentModal({
  plans,
  onClose,
  onCreated,
}: {
  plans: BenefitPlan[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({ employeeId: '', employeeName: '', planId: plans[0]?.id ?? '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const plan = plans.find((p) => p.id === form.planId);
      await benefitsService.createEnrollment({
        employeeId: form.employeeId,
        employeeName: form.employeeName,
        planId: form.planId,
        planName: plan?.planName ?? '',
        dependents: [],
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the enrollment.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Enroll employee in benefit plan" onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <EmployeePicker
          required
          value={form.employeeId}
          onChange={(emp) =>
            setForm({
              ...form,
              employeeId: emp?.id ?? '',
              employeeName: emp ? `${emp.firstName} ${emp.lastName}` : '',
            })
          }
        />
        <SelectField
          label="Benefit plan"
          required
          value={form.planId}
          onChange={(e) => setForm({ ...form, planId: e.target.value })}
        >
          {plans.length === 0 && <option value="">No plans available — add one first</option>}
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {p.planName} ({p.provider})
            </option>
          ))}
        </SelectField>
        {error && <p className="text-sm text-bad-600">{error}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-semibold text-ink-500 hover:bg-sand-100">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || plans.length === 0}
            className="rounded-lg bg-navy-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-800 disabled:opacity-50"
          >
            {submitting ? 'Enrolling…' : 'Enroll'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PlansTab() {
  const { data, loading, error, refetch } = useApiResource(() => benefitsService.listPlans(), []);
  const [showNew, setShowNew] = useState(false);

  const columns: Column<BenefitPlan>[] = [
    { header: 'Plan', render: (r) => <span className="font-medium">{r.planName}</span> },
    { header: 'Provider', render: (r) => r.provider },
    { header: 'Type', render: (r) => PLAN_TYPE_LABEL[r.planType] },
    { header: 'Coverage', render: (r) => formatCurrency(r.coverageAmount), align: 'right' },
    { header: 'Employer share', render: (r) => `${r.employerSharePercent}%`, align: 'right' },
    { header: 'Employee share', render: (r) => `${r.employeeSharePercent}%`, align: 'right' },
    {
      header: 'Status',
      render: (r) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
            r.isActive ? 'bg-good-100 text-good-600' : 'bg-sand-100 text-ink-500'
          }`}
        >
          {r.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800"
        >
          <Plus size={16} /> Add benefit plan
        </button>
      </div>
      {loading && <LoadingState label="Loading benefit plans…" />}
      {!loading && error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && (!data || data.length === 0) && (
        <EmptyState
          icon={Shield}
          title="No benefit plans set up"
          description="Add HMO, life insurance, retirement, or wellness plans to make them available for enrollment."
          actionLabel="Add benefit plan"
          onAction={() => setShowNew(true)}
        />
      )}
      {!loading && !error && data && data.length > 0 && (
        <DataTable columns={columns} rows={data} rowKey={(r) => r.id} />
      )}
      {showNew && <NewPlanModal onClose={() => setShowNew(false)} onCreated={refetch} />}
    </div>
  );
}

function EnrollmentsTab() {
  const { data, loading, error, refetch } = useApiResource(() => benefitsService.listEnrollments(), []);
  const { data: plans } = useApiResource(() => benefitsService.listPlans(), []);
  const [showNew, setShowNew] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function handleStatusChange(id: string, status: BenefitEnrollment['status']) {
    setUpdatingId(id);
    try {
      await benefitsService.updateEnrollmentStatus(id, status);
      refetch();
    } catch (err) {
      console.error('Could not update enrollment status', err);
    } finally {
      setUpdatingId(null);
    }
  }

  const columns: Column<BenefitEnrollment>[] = [
    { header: 'Employee', render: (r) => <span className="font-medium">{r.employeeName}</span> },
    { header: 'Plan', render: (r) => r.planName },
    { header: 'Dependents', render: (r) => r.dependents.length, align: 'center' },
    {
      header: 'Status',
      render: (r) => (
        <select
          value={r.status}
          disabled={updatingId === r.id}
          onChange={(e) => handleStatusChange(r.id, e.target.value as BenefitEnrollment['status'])}
          className="rounded-lg border border-line bg-surface px-2 py-1 text-xs font-semibold text-ink-700 disabled:opacity-50"
        >
          <option value="pending">Pending</option>
          <option value="enrolled">Enrolled</option>
          <option value="waived">Waived</option>
          <option value="terminated">Terminated</option>
        </select>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800"
        >
          <Plus size={16} /> Enroll employee
        </button>
      </div>
      {loading && <LoadingState label="Loading enrollments…" />}
      {!loading && error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && (!data || data.length === 0) && (
        <EmptyState
          icon={HeartPulse}
          title="No enrollments yet"
          description="Enroll employees and their dependents into an available benefit plan."
          actionLabel="Enroll employee"
          onAction={() => setShowNew(true)}
        />
      )}
      {!loading && !error && data && data.length > 0 && (
        <DataTable columns={columns} rows={data} rowKey={(r) => r.id} />
      )}
      {showNew && (
        <NewEnrollmentModal plans={plans ?? []} onClose={() => setShowNew(false)} onCreated={refetch} />
      )}
    </div>
  );
}

export function HmoBenefits() {
  const [tab, setTab] = useState<'plans' | 'enrollments'>('plans');

  return (
    <Layout title="HMO & Benefits Administration" subtitle="Manage benefit plans and employee enrollments">
      <div className="mb-4 flex w-fit rounded-lg border border-line bg-surface p-1">
        {(
          [
            { key: 'plans', label: 'Benefit Plans' },
            { key: 'enrollments', label: 'Enrollments' },
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

      {tab === 'plans' ? <PlansTab /> : <EnrollmentsTab />}
    </Layout>
  );
}
