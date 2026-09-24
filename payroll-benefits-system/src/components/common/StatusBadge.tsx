import { statusLabel } from '../../utils/statusLabels';

type Tone = 'good' | 'warn' | 'bad' | 'neutral' | 'teal';

const TONE_CLASSES: Record<Tone, string> = {
  good: 'bg-good-100 text-good-600',
  warn: 'bg-warn-100 text-warn-600',
  bad: 'bg-bad-100 text-bad-600',
  neutral: 'bg-sand-100 text-ink-500',
  teal: 'bg-teal-100 text-teal-700',
};

const STATUS_TONE: Record<string, Tone> = {
  // payroll
  draft: 'neutral',
  processing: 'teal',
  for_approval: 'warn',
  approved: 'good',
  released: 'good',
  rejected: 'bad',
  // payslip (within a payroll run) — same "good" tone as approved/released
  // since a computed payslip is a correct, ready-to-release result, not a
  // warning state
  computed: 'good',
  // claims
  submitted: 'teal',
  under_review: 'warn',
  reimbursed: 'good',
  // compensation
  pending: 'warn',
  implemented: 'good',
  // benefits
  enrolled: 'good',
  waived: 'neutral',
  terminated: 'bad',
  // employment
  active: 'good',
  on_leave: 'warn',
  suspended: 'bad',
  separated: 'neutral',
};

export function StatusBadge({ status }: { status: string }) {
  const tone = STATUS_TONE[status] ?? 'neutral';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_CLASSES[tone]}`}
    >
      {statusLabel(status)}
    </span>
  );
}
