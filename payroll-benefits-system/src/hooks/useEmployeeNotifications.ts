import { useApiResource } from './useApiResource';
import { claimsService } from '../services/claims.service';
import { statusLabel } from '../utils/statusLabels';
import type { NotificationItem } from './useNotifications';

/**
 * Self-service equivalent of useNotifications — the admin version pulls
 * company-wide payroll/claims/compensation data and links into the admin
 * pages, neither of which an employee should see or be sent to. This pulls
 * only the signed-in employee's own claims and links back into /ess/claims.
 */
async function loadEmployeeNotifications(): Promise<NotificationItem[]> {
  const claims = await claimsService.listMyClaims().catch(() => []);

  return claims
    .filter((c) => c.status === 'approved' || c.status === 'rejected' || c.status === 'reimbursed')
    .map((c) => ({
      id: c.id,
      title: `Your ${c.claimType} claim was ${statusLabel(c.status).toLowerCase()}`,
      subtitle: 'My Claims',
      linkTo: '/ess/claims',
    }));
}

export function useEmployeeNotifications() {
  return useApiResource<NotificationItem[]>(loadEmployeeNotifications, []);
}
