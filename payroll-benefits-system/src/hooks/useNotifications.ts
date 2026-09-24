import { useApiResource } from './useApiResource';
import { payrollService } from '../services/payroll.service';
import { claimsService } from '../services/claims.service';
import { compensationService } from '../services/compensation.service';
import { statusLabel } from '../utils/statusLabels';

export interface NotificationItem {
  id: string;
  title: string;
  subtitle: string;
  linkTo: string;
}

async function loadNotifications(): Promise<NotificationItem[]> {
  const [runs, claims, adjustments] = await Promise.all([
    payrollService.listRuns().catch(() => []),
    claimsService.listClaims().catch(() => []),
    compensationService.listAdjustments().catch(() => []),
  ]);

  const items: NotificationItem[] = [];

  runs
    .filter((r) => r.status === 'for_approval')
    .forEach((r) =>
      items.push({
        id: r.id,
        title: `Payroll run "${r.cutoffLabel}" — ${statusLabel(r.status)}`,
        subtitle: 'Payroll Management',
        linkTo: '/payroll',
      })
    );

  claims
    .filter((c) => c.status === 'submitted' || c.status === 'under_review')
    .forEach((c) =>
      items.push({
        id: c.id,
        title: `${c.employeeName}'s ${c.claimType} claim — ${statusLabel(c.status)}`,
        subtitle: 'Claims & Reimbursement',
        linkTo: '/claims',
      })
    );

  adjustments
    .filter((a) => a.status === 'pending')
    .forEach((a) =>
      items.push({
        id: a.id,
        title: `${a.employeeName}'s compensation adjustment is pending`,
        subtitle: 'Compensation Planning',
        linkTo: '/compensation',
      })
    );

  return items;
}

export function useNotifications() {
  return useApiResource<NotificationItem[]>(loadNotifications, []);
}
