import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2 } from 'lucide-react';
import { useNotifications } from '../../hooks/useNotifications';

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data: items, loading } = useNotifications();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const count = items?.length ?? 0;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function goTo(linkTo: string) {
    navigate(linkTo);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
        className="relative rounded-lg border border-line p-2.5 text-ink-500 transition hover:bg-sand-100"
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-clay-500 px-1 text-[10px] font-bold text-white">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
          <div className="border-b border-line px-4 py-3">
            <h3 className="text-sm font-semibold text-ink-900">Needs attention</h3>
          </div>

          {loading && <p className="px-4 py-4 text-sm text-ink-500">Loading…</p>}

          {!loading && count === 0 && (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              <CheckCircle2 size={22} className="text-good-600" />
              <p className="text-sm text-ink-500">You're all caught up.</p>
            </div>
          )}

          {!loading && count > 0 && (
            <ul className="max-h-80 overflow-y-auto py-1">
              {items!.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => goTo(item.linkTo)}
                    className="flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left transition hover:bg-sand-50"
                  >
                    <span className="text-sm font-medium text-ink-900">{item.title}</span>
                    <span className="text-xs text-ink-500">{item.subtitle}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
