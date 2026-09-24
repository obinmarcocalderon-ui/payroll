import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface StatCardProps {
  icon?: LucideIcon;
  label: string;
  value: string;
  tone?: 'navy' | 'clay' | 'teal' | 'good' | 'warn' | 'primary' | 'purple';
  hint?: ReactNode;
}

const TONE_BG: Record<NonNullable<StatCardProps['tone']>, string> = {
  navy: 'bg-navy-100 text-navy-900',
  clay: 'bg-clay-100 text-clay-600',
  teal: 'bg-teal-100 text-teal-700',
  good: 'bg-good-100 text-good-600',
  warn: 'bg-warn-100 text-warn-600',
  primary: 'bg-primary-100 text-primary-600',
  purple: 'bg-purple-100 text-purple-600',
};

export function StatCard({ icon: Icon, label, value, tone = 'navy', hint }: StatCardProps) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-line bg-surface p-5 shadow-sm">
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-sand-100/70" />
      {Icon && (
        <div className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${TONE_BG[tone]}`}>
          <Icon size={20} strokeWidth={1.75} />
        </div>
      )}
      <div className="relative mt-4 min-w-0">
        <p className="truncate text-xs font-semibold uppercase tracking-wide text-ink-500">{label}</p>
        <p className="mt-1 text-2xl font-bold text-ink-900">{value}</p>
        {hint && <p className="mt-1 text-xs text-ink-300">{hint}</p>}
      </div>
    </div>
  );
}
