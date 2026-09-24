import { useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert, Undo2, Wrench } from 'lucide-react';
import { Modal } from '../common/Modal';
import { LoadingState, ErrorState } from '../common/LoadError';
import { EmptyState } from '../common/EmptyState';
import { useApiResource } from '../../hooks/useApiResource';
import { payrollAnomalyService } from '../../services/payrollAnomaly.service';
import type { AnomalySeverity, AnomalyStatus, PayrollAnomaly, PayrollRun } from '../../types';

const SEVERITY_LABEL: Record<AnomalySeverity, string> = {
  critical: 'Critical',
  medium: 'Medium',
  low: 'Low',
};

const SEVERITY_TONE: Record<AnomalySeverity, string> = {
  critical: 'bg-bad-100 text-bad-600',
  medium: 'bg-warn-100 text-warn-600',
  low: 'bg-sand-100 text-ink-500',
};

const TYPE_LABEL: Record<string, string> = {
  unusual_pay_change: 'Unusual pay change',
  high_overtime: 'High overtime',
  duplicate_claim: 'Possible duplicate claim',
  missing_statutory_deduction: 'Missing statutory deduction',
  net_pay_error: 'Net pay error',
  proration_check_needed: 'Proration check needed',
};

function SeverityBadge({ severity }: { severity: AnomalySeverity }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${SEVERITY_TONE[severity]}`}>
      {SEVERITY_LABEL[severity]}
    </span>
  );
}

function AnomalyRow({
  anomaly,
  busy,
  onSetStatus,
}: {
  anomaly: PayrollAnomaly;
  busy: boolean;
  onSetStatus: (status: AnomalyStatus) => void;
}) {
  return (
    <div className="rounded-xl border border-line p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-ink-900">{anomaly.employeeName}</p>
            <SeverityBadge severity={anomaly.severity} />
            <span className="text-xs font-medium uppercase tracking-wide text-ink-500">
              {TYPE_LABEL[anomaly.anomalyType] ?? anomaly.anomalyType}
            </span>
          </div>
          {/* Explainability: the actual numbers compared, not a black-box score. */}
          <p className="mt-2 text-sm text-ink-900">{anomaly.description}</p>
          <p className="mt-1 text-xs text-ink-500">
            <span className="font-semibold">Suggested action: </span>
            {anomaly.suggestedAction}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          {anomaly.status === 'unresolved' && (
            <div className="flex gap-2">
              <button
                disabled={busy}
                onClick={() => onSetStatus('dismissed')}
                className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-500 transition hover:bg-sand-100 disabled:opacity-50"
              >
                Dismiss
              </button>
              <button
                disabled={busy}
                onClick={() => onSetStatus('needs_correction')}
                className="flex items-center gap-1.5 rounded-lg bg-clay-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                <Wrench size={13} /> Needs correction
              </button>
            </div>
          )}

          {anomaly.status === 'dismissed' && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-sand-100 px-3 py-1.5 text-xs font-semibold text-ink-500">
                <CheckCircle2 size={13} /> Dismissed
              </span>
              <button
                disabled={busy}
                onClick={() => onSetStatus('unresolved')}
                className="flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink-500 transition hover:bg-sand-100 disabled:opacity-50"
                title="Reopen this flag"
              >
                <Undo2 size={13} /> Reopen
              </button>
            </div>
          )}

          {anomaly.status === 'needs_correction' && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-clay-100 px-3 py-1.5 text-xs font-semibold text-clay-600">
                <Wrench size={13} /> Needs correction
              </span>
              <button
                disabled={busy}
                onClick={() => onSetStatus('dismissed')}
                className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink-500 transition hover:bg-sand-100 disabled:opacity-50"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function AnomalyPanel({ run, onClose, onChanged }: { run: PayrollRun; onClose: () => void; onChanged: () => void }) {
  const { data, loading, error, refetch } = useApiResource(() => payrollAnomalyService.list(run.id), [run.id]);
  const [rescanning, setRescanning] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleRescan() {
    setRescanning(true);
    try {
      await payrollAnomalyService.rescan(run.id);
      refetch();
      onChanged();
    } finally {
      setRescanning(false);
    }
  }

  async function handleSetStatus(anomaly: PayrollAnomaly, status: AnomalyStatus) {
    setBusyId(anomaly.id);
    try {
      await payrollAnomalyService.updateStatus(run.id, anomaly.id, status);
      refetch();
      onChanged();
    } finally {
      setBusyId(null);
    }
  }

  const anomalies = data ?? [];
  const blockingCount = anomalies.filter((a) => a.blocksApproval).length;

  return (
    <Modal title={`Anomalies — ${run.cutoffLabel}`} onClose={onClose} width="lg">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-lg bg-sand-50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-ink-900">
            <ShieldAlert size={16} className="text-clay-600" />
            {blockingCount > 0 ? (
              <span>
                <span className="font-semibold text-bad-600">{blockingCount}</span> flag(s) are blocking approval.
              </span>
            ) : (
              <span>No flags are currently blocking approval.</span>
            )}
          </div>
          <button
            onClick={handleRescan}
            disabled={rescanning}
            className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-900 transition hover:bg-sand-100 disabled:opacity-50"
          >
            <RefreshCw size={13} className={rescanning ? 'animate-spin' : ''} />
            {rescanning ? 'Re-scanning…' : 'Re-scan for anomalies'}
          </button>
        </div>

        {loading && <LoadingState label="Loading anomaly flags…" />}
        {!loading && error && <ErrorState message={error} onRetry={refetch} />}
        {!loading && !error && anomalies.length === 0 && (
          <EmptyState
            icon={AlertTriangle}
            title="No anomalies detected"
            description="This run's computed payroll, attendance, and claims data looks consistent with the rule-based checks."
          />
        )}

        {!loading && !error && anomalies.length > 0 && (
          <div className="space-y-3">
            {anomalies.map((a) => (
              <AnomalyRow
                key={a.id}
                anomaly={a}
                busy={busyId === a.id}
                onSetStatus={(status) => handleSetStatus(a, status)}
              />
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
