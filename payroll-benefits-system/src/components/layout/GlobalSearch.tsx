import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2 } from 'lucide-react';
import { useGlobalSearch } from '../../hooks/useGlobalSearch';

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const { results, loading } = useGlobalSearch(query);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

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
    setQuery('');
  }

  return (
    <div ref={containerRef} className="relative hidden md:block">
      <div className="flex items-center gap-2 rounded-lg border border-line bg-sand-50 px-3 py-2 text-sm text-ink-500 focus-within:border-teal-500">
        <Search size={16} className="shrink-0" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search employees, records…"
          className="w-56 bg-transparent text-ink-900 outline-none placeholder:text-ink-500"
        />
        {loading && <Loader2 size={14} className="shrink-0 animate-spin text-ink-300" />}
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
          {!loading && results.length === 0 && (
            <p className="px-4 py-4 text-sm text-ink-500">No matches for "{query}".</p>
          )}
          {results.length > 0 && (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((r) => (
                <li key={`${r.category}-${r.id}`}>
                  <button
                    onClick={() => goTo(r.linkTo)}
                    className="flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left transition hover:bg-sand-50"
                  >
                    <span className="flex items-center gap-2">
                      <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-700">
                        {r.category}
                      </span>
                      <span className="truncate text-sm font-medium text-ink-900">{r.title}</span>
                    </span>
                    <span className="truncate text-xs text-ink-500">{r.subtitle}</span>
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
