import type { ClaimType } from '../types';
import { formatCurrency } from '../utils/format';

/**
 * PLACEHOLDER VALUES — not the thesis's actual compensation policy caps.
 * Swap these for the real per-type limits before submission; everything
 * that renders a policy hint reads from this one map, so updating it here
 * is the only change needed.
 */
export const CLAIM_POLICY_LIMITS: Partial<Record<ClaimType, { amount: number; period: 'month' | 'year' }>> = {
  transportation: { amount: 2000, period: 'month' },
  medical: { amount: 5000, period: 'month' },
  meal: { amount: 1500, period: 'month' },
  training: { amount: 10000, period: 'year' },
  equipment: { amount: 15000, period: 'year' },
};

/** e.g. "Max ₱1,500/month for meal claims", or null if this type has no defined cap. */
export function claimPolicyHint(claimType: ClaimType, typeLabel: string): string | null {
  const limit = CLAIM_POLICY_LIMITS[claimType];
  if (!limit) return null;
  return `Max ${formatCurrency(limit.amount)}/${limit.period} for ${typeLabel.toLowerCase()} claims`;
}
