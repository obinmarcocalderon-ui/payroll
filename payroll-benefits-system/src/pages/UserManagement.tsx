import { useState } from 'react';
import { Plus, UserCog, Trash2, Pencil } from 'lucide-react';
import { Layout } from '../components/layout/Layout';
import { DataTable, type Column } from '../components/common/DataTable';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingState, ErrorState } from '../components/common/LoadError';
import { Modal } from '../components/common/Modal';
import { TextField } from '../components/common/FormField';
import { EmployeePicker } from '../components/common/EmployeePicker';
import { useApiResource } from '../hooks/useApiResource';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { userService } from '../services/user.service';
import { USER_ROLES, roleLabel, type SystemUser, type UserRole } from '../types';
import { formatDate } from '../utils/format';

function UserFormModal({
  title,
  initial,
  requirePassword,
  onClose,
  onSubmit,
}: {
  title: string;
  initial?: Partial<SystemUser>;
  requirePassword: boolean;
  onClose: () => void;
  onSubmit: (data: { name: string; email: string; role: UserRole; password?: string; employeeId: string | null }) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: initial?.fullName ?? '',
    email: initial?.email ?? '',
    role: (initial?.role ?? 'hr_staff') as UserRole,
    password: '',
    employeeId: initial?.employeeId ?? '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        name: form.name,
        email: form.email,
        role: form.role,
        password: form.password || undefined,
        employeeId: form.employeeId || null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this account.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <TextField
          label="Full name"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <TextField
          label="Email"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
<label className="block text-sm">
          <span className="mb-1.5 block font-medium text-ink-900">Role</span>
          <select
            required
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
            className="w-full rounded-lg border border-navy-100 bg-white px-3 py-2 text-sm text-ink-900 outline-none transition focus:border-teal-500"
          >
            {USER_ROLES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <TextField
          label={requirePassword ? 'Password' : 'New password (leave blank to keep current)'}
          type="password"
          required={requirePassword}
          minLength={8}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        <EmployeePicker
          value={form.employeeId}
          onChange={(emp) => setForm({ ...form, employeeId: emp?.id ?? '' })}
        />
        <p className="-mt-2 text-xs text-ink-500">
          Linking an employee lets this account use "Switch to Employee View" for that employee's own data.
        </p>
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
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function UserManagement() {
  const { data, loading, error, refetch } = useApiResource(() => userService.list(), []);
  const { data: currentUser } = useCurrentUser();
  const [showNew, setShowNew] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleDelete(user: SystemUser) {
    if (!confirm(`Remove ${user.fullName}'s account? This cannot be undone.`)) return;
    setBusyId(user.id);
    try {
      await userService.remove(user.id);
      refetch();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not remove this account.');
    } finally {
      setBusyId(null);
    }
  }

  const columns: Column<SystemUser>[] = [
    { header: 'Name', render: (r) => <span className="font-medium">{r.fullName}</span> },
    { header: 'Email', render: (r) => r.email },
{ header: 'Role', render: (r) => roleLabel(r.role) },
    { header: 'Created', render: (r) => formatDate(r.createdAt) },
    {
      header: '',
      render: (r) => (
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setEditingUser(r)}
            className="rounded-lg p-1.5 text-ink-500 transition hover:bg-sand-100"
            aria-label="Edit"
          >
            <Pencil size={16} />
          </button>
          <button
            disabled={busyId === r.id || currentUser?.id === r.id}
            onClick={() => handleDelete(r)}
            className="rounded-lg p-1.5 text-ink-500 transition hover:bg-bad-100 hover:text-bad-600 disabled:opacity-30"
            aria-label="Remove"
            title={currentUser?.id === r.id ? "You can't remove your own account" : 'Remove account'}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
      align: 'right',
    },
  ];

  return (
    <Layout title="User Management" subtitle="Accounts that can sign in to this system">
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-800"
        >
          <Plus size={16} /> Add user
        </button>
      </div>

      {loading && <LoadingState label="Loading users…" />}
      {!loading && error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && (!data || data.length === 0) && (
        <EmptyState
          icon={UserCog}
          title="No user accounts yet"
          description="Add accounts for HR staff who need to sign in to this system."
          actionLabel="Add user"
          onAction={() => setShowNew(true)}
        />
      )}
      {!loading && !error && data && data.length > 0 && (
        <DataTable columns={columns} rows={data} rowKey={(r) => r.id} />
      )}

      {showNew && (
        <UserFormModal
          title="Add user"
          requirePassword
          onClose={() => setShowNew(false)}
          onSubmit={async (payload) => {
            await userService.create({
              name: payload.name,
              email: payload.email,
              role: payload.role,
              password: payload.password!,
              employeeId: payload.employeeId,
            });
            refetch();
          }}
        />
      )}

      {editingUser && (
        <UserFormModal
          title={`Edit ${editingUser.fullName}`}
          initial={editingUser}
          requirePassword={false}
          onClose={() => setEditingUser(null)}
          onSubmit={async (payload) => {
            await userService.update(editingUser.id, payload);
            refetch();
          }}
        />
      )}
    </Layout>
  );
}
