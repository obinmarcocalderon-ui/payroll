import { Link, NavLink } from 'react-router-dom';
import {
  LayoutGrid,
  Users,
  Banknote,
  LineChart,
  Receipt,
  HeartPulse,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { useState } from 'react';
import { useCurrentUser, isAdmin } from '../../hooks/useCurrentUser';

const ROLE_LABEL = { admin: 'Admin', hr_staff: 'HR Staff', employee: 'Employee' } as const;

function initialsOf(fullName?: string) {
  if (!fullName) return '—';
  return fullName
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutGrid, end: true },
  { to: '/employees', label: 'Employees', icon: Users },
  { to: '/payroll', label: 'Payroll Management', icon: Banknote },
  { to: '/compensation', label: 'Compensation Planning', icon: LineChart },
  { to: '/claims', label: 'Claims & Reimbursement', icon: Receipt },
  { to: '/benefits', label: 'HMO & Benefits', icon: HeartPulse },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { data: user } = useCurrentUser();
  const accountHref = isAdmin(user) ? '/users' : '#';

  return (
    <aside
      className={`flex h-screen shrink-0 flex-col bg-primary-700 text-white transition-all ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="flex items-center gap-3 px-5 py-6">
        <svg width="40" height="40" viewBox="0 0 100 100" className="shrink-0">
  <defs>
    <linearGradient id="ring1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#2563EB" />
      <stop offset="50%" stopColor="#7C3AED" />
      <stop offset="100%" stopColor="#C026D3" />
    </linearGradient>
    <linearGradient id="ring2" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stopColor="#F59E0B" />
      <stop offset="50%" stopColor="#EA580C" />
      <stop offset="100%" stopColor="#DB2777" />
    </linearGradient>
    <linearGradient id="ring3" x1="100%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor="#0EA5E9" />
      <stop offset="50%" stopColor="#8B5CF6" />
      <stop offset="100%" stopColor="#EC4899" />
    </linearGradient>
    <linearGradient id="nucleusGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stopColor="#4ADE80" />
      <stop offset="100%" stopColor="#16A34A" />
    </linearGradient>
  </defs>
  <ellipse cx="50" cy="50" rx="46" ry="17" fill="none" stroke="url(#ring1)" strokeWidth="5" transform="rotate(-30 50 50)" />  <ellipse cx="50" cy="50" rx="46" ry="17" fill="none" stroke="url(#ring2)" strokeWidth="5" transform="rotate(30 50 50)" />
  <ellipse cx="50" cy="50" rx="46" ry="17" fill="none" stroke="url(#ring3)" strokeWidth="5" transform="rotate(90 50 50)" />
  <ellipse cx="50" cy="50" rx="22" ry="12" fill="url(#nucleusGrad)" />
  <text x="50" y="54" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="11" fill="#FFFFFF">
  ANI
</text>
</svg>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-red-600">ARCHON NELL</p>
            <p className="truncate text-[10px] font-semibold tracking-wide text-white">INCORPORATED</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? 'bg-primary-500 text-white'
                  : 'text-white/75 hover:bg-white/10 hover:text-white'
              }`
            }
            title={collapsed ? label : undefined}
          >
            <Icon size={18} strokeWidth={1.75} className="shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/20 p-3">
        {!collapsed ? (
          <div className="flex items-center gap-2">
            <Link
              to={accountHref}
              onClick={(e) => {
                if (accountHref === '#') e.preventDefault();
              }}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-1 transition hover:bg-white/10"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-500 text-sm font-semibold text-white">
                {initialsOf(user?.fullName)}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{user?.fullName ?? 'Not signed in'}</p>
                <p className="truncate text-xs text-white/60">{user ? ROLE_LABEL[user.role] : 'Guest'}</p>
              </div>
            </Link>
            <button
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
              title="Collapse"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/20 text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <ChevronsLeft size={16} />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Link
              to={accountHref}
              onClick={(e) => {
                if (accountHref === '#') e.preventDefault();
              }}
              title={user?.fullName ?? 'Not signed in'}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-500 text-sm font-semibold text-white transition hover:opacity-90"
            >
              {initialsOf(user?.fullName)}
            </Link>
            <button
              onClick={() => setCollapsed(false)}
              aria-label="Expand sidebar"
              title="Expand"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}