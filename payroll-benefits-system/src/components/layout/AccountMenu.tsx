import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, UserCog, ChevronDown } from 'lucide-react';
import { useCurrentUser, isAdmin } from '../../hooks/useCurrentUser';
import { authService } from '../../services/auth.service';

const ROLE_LABEL = { admin: 'Admin', hr_staff: 'HR Staff', employee: 'Employee' } as const;

export function AccountMenu() {
  const { data: user } = useCurrentUser();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '—';

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleSignOut() {
    await authService.logout();
    navigate('/login');
    window.location.reload();
  }

  if (!user) {
    return (
      <Link
        to="/login"
        className="flex items-center gap-1.5 rounded-lg bg-navy-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-navy-800"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div ref={containerRef} className="relative border-l border-line pl-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-3 rounded-lg py-1 pr-1 transition hover:bg-sand-100"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-700 text-sm font-semibold text-white">
          {initials}
        </div>
        <div className="hidden text-left text-sm sm:block">
          <p className="font-semibold text-ink-900">{user.fullName}</p>
          <p className="text-xs text-ink-500">{ROLE_LABEL[user.role]}</p>
        </div>
        <ChevronDown size={16} className={`hidden text-ink-500 transition sm:block ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-sm font-semibold text-ink-900">{user.fullName}</p>
            <p className="truncate text-xs text-ink-500">{ROLE_LABEL[user.role]}</p>
          </div>

          <div className="py-1">
{isAdmin(user) && (
              <Link
                to="/users"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-ink-900 transition hover:bg-sand-50"
              >
                <UserCog size={16} className="text-ink-500" />
                User &amp; account settings
              </Link>
            )}
          </div>

          <div className="border-t border-line py-1">
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-bad-600 transition hover:bg-bad-100/50"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}