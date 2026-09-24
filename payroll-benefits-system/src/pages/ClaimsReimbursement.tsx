import { useMemo, useState } from 'react';
import { Plus, Receipt, Check, X as XIcon, Banknote, Hourglass, CheckCircle2, Wallet, Search, RotateCcw } from 'lucide-react';
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
import { claimsService } from '../services/claims.service';
import { claimPolicyHint } from '../config/claimPolicyLimits';
import type { Claim, ClaimType } from '../types';
import { formatCurrency, formatDate } from '../utils/format';
import { statusLabel } from '../utils/statusLabels';

// "submitted" and "under_review" both resolve to this same canonical
// label (see utils/statusLabels) — pulling it from there once here keeps
// the stat card and filter option in sync with the row badge instead of
// each hardcoding their own copy of the string.
const PENDING_APPROVAL_LABEL = statusLabel('submitted');
const PENDING_APPROVAL_FILTER = 'pending_approval';

const CLAIM_TYPE_LABEL: Record<ClaimType, string> = {
  transportation: 'Transportation',
  medical: 'Medical',
  meal: 'Meal',
  training: 'Training',
  equipment: 'Equipment',
  other: 'Other',
};

function NewClaimModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    employeeId: '',
    employeeName: '',
    department: '',
    claimType: 'transportation' as ClaimType,
    description: '',
    amount: '',
    dateIncurred: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await claimsService.submitClaim({
        employeeId: form.employeeId,
        employeeName: form.employeeName,
        department: form.department,
        claimType: form.claimType,
        description: form.description,
        amount: Number(form.amount),
        dateIncurred: form.dateIncurred,
      });
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit the claim.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Submit reimbursement claim" onClose={onClose} width="lg">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <EmployeePicker
          required
          value={form.employeeId}
          onChange={(emp) =>
            setForm({
              ...form,
              employeeId: emp?.id ?? '',
              employeeName: emp ? `${emp.firstName} ${emp.lastName}` : '',
              department: emp?.department ?? form.department,
            })
          }
        />
        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Department"
            required
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
          />
          <div>
            <SelectField
              label="Claim type"
              required
              value={form.claimType}
              onChange={(e) => setForm({ ...form, claimType: e.target.value as ClaimType })}
            >
              {Object.entries(CLAIM_TYPE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </SelectField>
            {claimPolicyHint(form.claimType, CLAIM_TYPE_LABEL[form.claimType]) && (
              <p className="mt-1.5 text-xs text-ink-500">
                {claimPolicyHint(form.claimType, CLAIM_TYPE_LABEL[form.claimType])}
              </p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <TextField
            label="Amount"
            type="number"
            required
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
          <TextField
            label="Date incurred"
            type="date"
            required
            value={form.dateIncurred}
            onChange={(e) => setForm({ ...form, dateIncurred: e.target.value })}
          />
        </div>
        <TextAreaField
          label="Description"
          required
          placeholder="What was this expense for?"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
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
            {submitting ? 'Submitting…' : 'Submit claim'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function ClaimsReimbursement() {
  const { data, loading, error, refetch } = useApiResource(() => claimsService.listClaims(), []);
  const [showNew, setShowNew] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter((c) => {
      if (typeFilter && c.claimType !== typeFilter) return false;
      if (statusFilter === PENDING_APPROVAL_FILTER) {
        if (c.status !== 'submitted' && c.status !== 'under_review') return false;
      } else if (statusFilter && c.status !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return c.id.toLowerCase().includes(q) || c.employeeName.toLowerCase().includes(q);
    });
  }, [data, search, typeFilter, statusFilter]);

  function resetFilters() {
    setSearch('');
    setTypeFilter('');
    setStatusFilter('');
  }

  const allClaims = data ?? [];
  const pending = allClaims.filter((c) => c.status === 'submitted' || c.status === 'under_review');
  const approved = allClaims.filter((c) => c.status === 'approved');
  const reimbursed = allClaims.filter((c) => c.status === 'reimbursed');
  const totalVolume = allClaims.reduce((sum, c) => sum + c.amount, 0);
  const pendingVolume = pending.reduce((sum, c) => sum + c.amount, 0);
  const approvedVolume = approved.reduce((sum, c) => sum + c.amount, 0);
  const reimbursedVolume = reimbursed.reduce((sum, c) => sum + c.amount, 0);

  async function decide(id: string, status: 'approved' | 'rejected') {
    setBusyId(id);
    try {
      await claimsService.decideClaim(id, status);
      refetch();
    } finally {
      setBusyId(null);
    }
  }

  async function reimburse(id: string) {
    setBusyId(id);
    try {
      await claimsService.markReimbursed(id);
      refetch();
    } finally {
      setBusyId(null);
    }
  }

  const columns: Column<Claim>[] = [
    { header: 'Employee', render: (r) => <span className="font-medium">{r.employeeName}</span> },
    { header: 'Department', render: (r) => r.department },
    { header: 'Type', render: (r) => CLAIM_TYPE_LABEL[r.claimType] },
    { header: 'Amount', render: (r) => formatCurrency(r.amount), align: 'right' },
    { header: 'Date incurred', render: (r) => formatDate(r.dateIncurred) },
    { header: 'Submitted', render: (r) => formatDate(r.dateSubmitted) },
    { header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      header: '',
      render: (r) => {
        if (r.status === 'submitted' || r.status === 'under_review') {
          return (
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
          );
        }
        if (r.status === 'approved') {
          return (
            <button
              disabled={busyId === r.id}
              onClick={() => reimburse(r.id)}
              className="flex items-center gap-1.5 rounded-lg bg-teal-100 px-2.5 py-1.5 text-xs font-semibold text-teal-700 transition hover:bg-teal-100/70 disabled:opacity-50"
            >
              <Banknote size={14} /> Mark reimbursed
            </button>
          );
        }
        return null;
      },
      align: 'right',
    },
  ];

  return (
    <Layout title="Claims &amp; Reimbursement" subtitle="Submit, approve &amp; track">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-ink-900">Claims &amp; Reimbursement</h2>
          <p className="mt-1 text-sm text-ink-500">Submit, approve, and track employee expense reimbursements</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
        >
          <Plus size={16} /> Submit New Claim
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Receipt}
          label="Total Claims"
          value={String(allClaims.length)}
          tone="navy"
          hint={`${formatCurrency(totalVolume)} volume`}
        />
        <StatCard
          icon={Hourglass}
          label={PENDING_APPROVAL_LABEL}
          value={String(pending.length)}
          tone="clay"
          hint={formatCurrency(pendingVolume)}
        />
        <StatCard
          icon={CheckCircle2}
          label="Approved"
          value={formatCurrency(approvedVolume)}
          tone="primary"
          hint="Awaiting disbursement"
        />
        <StatCard
          icon={Wallet}
          label="Reimbursed"
          value={formatCurrency(reimbursedVolume)}
          tone="good"
          hint="Paid out"
        />
      </div>

      <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-ink-900">Claims Pipeline</h3>
        <p className="mb-4 text-xs text-ink-500">All reimbursement requests</p>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-line bg-sand-50 px-3 py-2 text-sm">
            <Search size={16} className="shrink-0 text-ink-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, employee…"
              className="w-full bg-transparent text-ink-900 outline-none placeholder:text-ink-500"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink-900 outline-none focus:border-teal-500"
          >
            <option value="">All Types</option>
            {Object.entries(CLAIM_TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink-900 outline-none focus:border-teal-500"
          >
            <option value="">All Status</option>
            <option value={PENDING_APPROVAL_FILTER}>{PENDING_APPROVAL_LABEL}</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="reimbursed">Reimbursed</option>
          </select>
          <button
            onClick={resetFilters}
            className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink-500 transition hover:bg-sand-100"
          >
            <RotateCcw size={14} /> Reset
          </button>
        </div>

        {loading && <LoadingState label="Loading claims…" />}
        {!loading && error && <ErrorState message={error} onRetry={refetch} />}
        {!loading && !error && (!data || data.length === 0) && (
          <EmptyState
            icon={Receipt}
            title="No claims submitted yet"
            description="Reimbursement claims for transportation, medical, meals, and other expenses will appear here."
            actionLabel="Submit claim"
            onAction={() => setShowNew(true)}
          />
        )}
        {!loading && !error && data && data.length > 0 && filtered.length === 0 && (
          <EmptyState icon={Search} title="No matching claims" description="Try adjusting your search or filters." />
        )}
        {!loading && !error && filtered.length > 0 && (
          <DataTable columns={columns} rows={filtered} rowKey={(r) => r.id} />
        )}
      </div>

      {showNew && <NewClaimModal onClose={() => setShowNew(false)} onCreated={refetch} />}
    </Layout>
  );
}
