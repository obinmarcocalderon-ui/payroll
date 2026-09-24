import { apiClient } from './apiClient';
import type { Claim } from '../types';

export const claimsService = {
  listClaims: () => apiClient.get<Claim[]>('/claims'),
  getClaim: (id: string) => apiClient.get<Claim>(`/claims/${id}`),
  submitClaim: (
    payload: Omit<Claim, 'id' | 'status' | 'dateSubmitted'>
  ) => apiClient.post<Claim>('/claims', payload),
  decideClaim: (id: string, status: 'approved' | 'rejected', reviewerNote?: string) =>
    apiClient.patch<Claim>(`/claims/${id}`, { status, reviewerNote }),
  markReimbursed: (id: string) => apiClient.post<Claim>(`/claims/${id}/reimburse`),

  listMyClaims: () => apiClient.get<Claim[]>('/me/claims'),
  submitMyClaim: (
    payload: Pick<Claim, 'claimType' | 'description' | 'amount' | 'dateIncurred'>
  ) => apiClient.post<Claim>('/me/claims', payload),
};
