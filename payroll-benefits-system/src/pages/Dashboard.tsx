import {
  Receipt,
  HeartPulse,
  UserPlus,
  RefreshCw,
  FilePlus,
  ShieldPlus,
  LineChart as LineChartIcon,
  Search as SearchIcon,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { Layout } from '../components/layout/Layout';
import { StatCard } from '../components/common/StatCard';
import { DonutStat } from '../components/common/DonutStat';
import { LoadingState, ErrorState } from '../components/common/LoadError';
import { StatusBadge } from '../components/common/StatusBadge';
import { useApiResource } from '../hooks/useApiResource';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { employeeService } from '../services/employee.service';
import { payrollService } from '../services/payroll.service';
import { claimsService } from '../services/claims.service';
import { compensationService } from '../services/compensation.service';
import { benefitsService } from '../services/benefits.service';
import { formatCurrency, formatDate } from '../utils/format';

const DEPARTMENT_COLORS = ['#2f5fdb', '#7c5cf5', '#1e7a4c', '#c97b5a', '#2f6b82', '#b3781a', '#202f63'];

const QUICK_ACTIONS = [
  { to: '/payroll', label: 'Run New Payroll', icon: RefreshCw },
  { to: '/employees', label: 'Add Employee', icon: UserPlus },
  { to: '/claims', label: 'Submit Claim', icon: FilePlus },
  { to: '/benefits', label: 'Enroll HMO', icon: ShieldPlus },
  { to: '/compensation', label: 'Salary Adjustment', icon: LineChartIcon },
  { to: '/employees', label: 'Employee Directory', icon: SearchIcon },
];

export function Dashboard() {
  const { data: user } = useCurrentUser();
  const { data: employees, loading: employeesLoading, error: employeesError } = useApiResource(
    () => employeeService.list(),
    []
  );
  const { data: runs, loading: runsLoading, error: runsError } = useApiResource(
    () => payrollService.listRuns(),
    []
  );
  const { data: claims, loading: claimsLoading, error: claimsError } = useApiResource(
    () => claimsService.listClaims(),
    []
  );
  const { data: adjustments } = useApiResource(() => compensationService.listAdjustments(), []);
  const { data: enrollments } = useApiResource(() => benefitsService.listEnrollments(), []);
  const { data: plans } = useApiResource(() => benefitsService.listPlans(), []);

  const loading = employeesLoading || runsLoading || claimsLoading;
  const error = employeesError || runsError || claimsError;
  const firstName = user?.fullName?.split(' ')[0];

  if (loading) {
    return (
      <Layout title="Dashboard" subtitle="Overview">
        <LoadingState label="Loading dashboard…" />
      </Layout>
    );
  }
  if (error) {
    return (
      <Layout title="Dashboard" subtitle="Overview">
        <ErrorState message={error} onRetry={() => window.location.reload()} />
      </Layout>
    );
  }

  const emp = employees ?? [];
  const allRuns = runs ?? [];
  const allClaims = claims ?? [];
  const allAdjustments = adjustments ?? [];
  const allEnrollments = enrollments ?? [];
  const allPlans = plans ?? [];

  const activeCount = emp.filter((e) => e.employmentStatus === 'active').length;
  const onLeaveCount = emp.filter((e) => e.employmentStatus === 'on_leave').length;

  const completedRuns = allRuns.filter((r) => r.status === 'released');
  const netPayrollYtd = completedRuns.reduce((sum, r) => sum + r.netTotal, 0);

  const pendingClaims = allClaims.filter((c) => c.status === 'submitted' || c.status === 'under_review');
  const pendingClaimsTotal = pendingClaims.reduce((sum, c) => sum + c.amount, 0);

  const enrolledMembers = allEnrollments.filter((e) => e.status === 'enrolled');
  const planCoverageById = new Map(allPlans.map((p) => [p.id, p.coverageAmount]));
  const hmoCoverageTotal = enrolledMembers.reduce((sum, e) => sum + (planCoverageById.get(e.planId) ?? 0), 0);

  const departmentCounts = new Map<string, number>();
  for (const e of emp) {
    departmentCounts.set(e.department, (departmentCounts.get(e.department) ?? 0) + 1);
  }
  const departmentSlices = [...departmentCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ label, value, color: DEPARTMENT_COLORS[i % DEPARTMENT_COLORS.length] }));

  const claimStatusSlices = [
    {
      label: 'Pending',
      value: allClaims.filter((c) => c.status === 'submitted' || c.status === 'under_review').length,
      color: '#202f63',
    },
    { label: 'Approved', value: allClaims.filter((c) => c.status === 'approved').length, color: '#2f5fdb' },
    { label: 'Rejected', value: allClaims.filter((c) => c.status === 'rejected').length, color: '#2f6b82' },
    { label: 'Reimbursed', value: allClaims.filter((c) => c.status === 'reimbursed').length, color: '#1e7a4c' },
  ];

  const trendByPeriod = new Map<string, number>();
  for (const r of [...allRuns].sort((a, b) => a.payDate.localeCompare(b.payDate))) {
    const period = r.payDate ? new Date(r.payDate).toLocaleDateString('en-PH', { month: 'short', year: '2-digit' }) : r.cutoffLabel;
    trendByPeriod.set(period, (trendByPeriod.get(period) ?? 0) + r.netTotal);
  }
  const trendData = [...trendByPeriod.entries()].map(([period, net]) => ({ period, net }));

  const latestRun = [...allRuns].sort((a, b) => b.payDate.localeCompare(a.payDate))[0];
  const pendingAdjustments = allAdjustments.filter((a) => a.status === 'pending');

  const unresolvedAnomalies = allRuns.reduce((sum, r) => sum + r.unresolvedAnomaliesCount, 0);
  const blockingAnomalies = allRuns.reduce((sum, r) => sum + r.blockingAnomaliesCount, 0);
  const runsWithAnomalies = allRuns.filter((r) => r.unresolvedAnomaliesCount > 0).length;

  return (
    <Layout title="Dashboard" subtitle="Overview">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-ink-900">
              Welcome back{firstName ? `, ${firstName}` : ''}
            </h2>
            <p className="mt-1 text-sm text-ink-500">
              Here's what's happening with payroll and benefits today.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/payroll"
              className="flex items-center gap-2 rounded-lg border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink-900 transition hover:bg-sand-100"
            >
              <RefreshCw size={16} /> Run Payroll
            </Link>
            <Link
              to="/employees"
              className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-700"
            >
              <UserPlus size={16} /> Add Employee
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Employees"
            value={String(emp.length)}
            hint={
              <span>
                <span className="text-primary-600">{activeCount} active</span>
                {onLeaveCount > 0 && <span> · {onLeaveCount} on leave</span>}
              </span>
            }
          />
          <StatCard
            label="Net Payroll YTD"
            value={formatCurrency(netPayrollYtd)}
            hint={`Across ${completedRuns.length} completed runs`}
          />
          <StatCard
            label="Pending Claims"
            value={String(pendingClaims.length)}
            hint={`${formatCurrency(pendingClaimsTotal)} total in pipeline`}
          />
          <StatCard
            label="HMO Enrolled"
            value={String(enrolledMembers.length)}
            hint={`${formatCurrency(hmoCoverageTotal)} total coverage`}
          />
        </div>

        <Link
          to="/payroll"
          className={`flex items-center justify-between gap-4 rounded-xl border p-4 shadow-sm transition ${
            unresolvedAnomalies > 0
              ? 'border-clay-100 bg-clay-100/30 hover:bg-clay-100/50'
              : 'border-line bg-surface hover:bg-sand-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                unresolvedAnomalies > 0 ? 'bg-clay-100 text-clay-600' : 'bg-good-100 text-good-600'
              }`}
            >
              {unresolvedAnomalies > 0 ? <ShieldAlert size={18} /> : <ShieldCheck size={18} />}
            </div>
            <div>
              <p className="text-sm font-semibold text-ink-900">AI Anomaly Alerts</p>
              <p className="text-xs text-ink-500">
                {unresolvedAnomalies > 0
                  ? `${unresolvedAnomalies} unresolved flag${unresolvedAnomalies === 1 ? '' : 's'} across ${runsWithAnomalies} payroll run${runsWithAnomalies === 1 ? '' : 's'}${blockingAnomalies > 0 ? ` · ${blockingAnomalies} blocking approval` : ''}`
                  : 'No anomalies flagged — rule-based checks run on every payroll compute.'}
              </p>
            </div>
          </div>
          <span className="shrink-0 text-xs font-semibold text-primary-600">Review →</span>
        </Link>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-line bg-surface p-5 shadow-sm lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-ink-900">Net Payroll Trend</h3>
                <p className="text-xs text-ink-500">Net disbursement per payroll run</p>
              </div>
              <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-600">YTD</span>
            </div>
            {trendData.length === 0 ? (
              <p className="py-16 text-center text-sm text-ink-500">
                No payroll history yet — process a run to see trends here.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={trendData} margin={{ left: -12 }}>
                  <defs>
                    <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2f5fdb" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#2f5fdb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7eaf3" vertical={false} />
                  <XAxis dataKey="period" tick={{ fontSize: 12 }} stroke="#a4abbd" axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12 }} stroke="#a4abbd" axisLine={false} tickLine={false} width={0} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Area type="monotone" dataKey="net" name="Net pay" stroke="#2f5fdb" strokeWidth={2.5} fill="url(#netFill)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-ink-900">Workforce by Department</h3>
                <p className="text-xs text-ink-500">Headcount distribution</p>
              </div>
              <span className="rounded-full bg-sand-100 px-3 py-1 text-xs font-semibold text-ink-500">
                {emp.length} Total
              </span>
            </div>
            {departmentSlices.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-500">No employees yet.</p>
            ) : (
              <DonutStat data={departmentSlices} centerValue={String(emp.length)} centerLabel="Employees" />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink-900">Latest Payroll Run</h3>
              {latestRun && <StatusBadge status={latestRun.status} />}
            </div>
            {!latestRun ? (
              <p className="py-10 text-center text-sm text-ink-500">No payroll runs yet.</p>
            ) : (
              <>
                <p className="mb-4 text-xs text-ink-500">{latestRun.cutoffLabel}</p>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Employees</p>
                    <p className="mt-1 text-lg font-bold text-ink-900">{latestRun.totalEmployees}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Gross</p>
                    <p className="mt-1 text-lg font-bold text-ink-900">{formatCurrency(latestRun.grossTotal)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Net Pay</p>
                    <p className="mt-1 text-lg font-bold text-primary-600">{formatCurrency(latestRun.netTotal)}</p>
                  </div>
                </div>
                <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                  <p className="text-xs text-ink-500">Pay date: {formatDate(latestRun.payDate)}</p>
                  <Link
                    to="/payroll"
                    className="rounded-lg bg-primary-100 px-3 py-2 text-xs font-semibold text-primary-600 transition hover:bg-primary-100/70"
                  >
                    View Payroll →
                  </Link>
                </div>
              </>
            )}
          </div>

          <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-ink-900">Claims by Status</h3>
                <p className="text-xs text-ink-500">Reimbursement pipeline</p>
              </div>
              <Link to="/claims" className="text-xs font-semibold text-primary-600 hover:underline">
                Manage →
              </Link>
            </div>
            {allClaims.length === 0 ? (
              <p className="py-10 text-center text-sm text-ink-500">No claims filed yet.</p>
            ) : (
              <DonutStat data={claimStatusSlices} centerValue={String(allClaims.length)} centerLabel="Claims" />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
            <h3 className="mb-1 text-sm font-semibold text-ink-900">Pending Approvals</h3>
            <p className="mb-4 text-xs text-ink-500">Items needing your attention</p>
            <div className="divide-y divide-line">
              <div className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-clay-100 text-clay-600">
                    <Receipt size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink-900">Claims</p>
                    <p className="truncate text-xs text-ink-500">{pendingClaims.length} pending reimbursement requests</p>
                  </div>
                </div>
                <Link
                  to="/claims"
                  className="shrink-0 rounded-lg bg-primary-100 px-3 py-1.5 text-xs font-semibold text-primary-600 transition hover:bg-primary-100/70"
                >
                  Review
                </Link>
              </div>
              <div className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-600">
                    <LineChartIcon size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink-900">Salary Adjustments</p>
                    <p className="truncate text-xs text-ink-500">{pendingAdjustments.length} compensation changes pending</p>
                  </div>
                </div>
                <Link
                  to="/compensation"
                  className="shrink-0 rounded-lg bg-primary-100 px-3 py-1.5 text-xs font-semibold text-primary-600 transition hover:bg-primary-100/70"
                >
                  Review
                </Link>
              </div>
              <div className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy-100 text-navy-900">
                    <HeartPulse size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink-900">HMO Renewals</p>
                    <p className="truncate text-xs text-ink-500">{enrolledMembers.length} active members to monitor</p>
                  </div>
                </div>
                <Link
                  to="/benefits"
                  className="shrink-0 rounded-lg bg-primary-100 px-3 py-1.5 text-xs font-semibold text-primary-600 transition hover:bg-primary-100/70"
                >
                  View
                </Link>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface p-5 shadow-sm">
            <h3 className="mb-1 text-sm font-semibold text-ink-900">Quick Actions</h3>
            <p className="mb-4 text-xs text-ink-500">Common tasks</p>
            <div className="grid grid-cols-2 gap-3">
              {QUICK_ACTIONS.map((item, i) => (
                <Link
                  key={`${item.to}-${i}`}
                  to={item.to}
                  className="flex flex-col items-center gap-2 rounded-lg border border-line bg-sand-50 px-3 py-4 text-center text-xs font-semibold text-ink-900 transition hover:bg-sand-100"
                >
                  <item.icon size={18} className="text-primary-600" strokeWidth={1.75} />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
