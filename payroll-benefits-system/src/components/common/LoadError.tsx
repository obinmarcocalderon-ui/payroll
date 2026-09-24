import { Loader2, AlertTriangle } from 'lucide-react';

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-6 py-16 text-sm text-ink-500">
      <Loader2 size={18} className="animate-spin" />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-bad-100 bg-bad-100/40 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bad-100 text-bad-600">
        <AlertTriangle size={22} strokeWidth={1.75} />
      </div>
      <h3 className="text-sm font-semibold text-ink-900">Couldn't load this data</h3>
      <p className="max-w-sm text-sm text-ink-500">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 rounded-lg border border-line bg-surface px-4 py-2 text-sm font-semibold text-ink-900 transition hover:bg-sand-100"
        >
          Try again
        </button>
      )}
    </div>
  );
}
