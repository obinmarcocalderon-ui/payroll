import { apiClient } from './apiClient';
import type { BenefitPlan, BenefitEnrollment } from '../types';

export const benefitsService = {
  listPlans: () => apiClient.get<BenefitPlan[]>('/benefits/plans'),
  createPlan: (payload: Omit<BenefitPlan, 'id'>) =>
    apiClient.post<BenefitPlan>('/benefits/plans', payload),
  updatePlan: (id: string, payload: Partial<Omit<BenefitPlan, 'id'>>) =>
    apiClient.patch<BenefitPlan>(`/benefits/plans/${id}`, payload),

  listEnrollments: () => apiClient.get<BenefitEnrollment[]>('/benefits/enrollments'),
  createEnrollment: (
    payload: Omit<BenefitEnrollment, 'id' | 'status' | 'enrollmentDate'>
  ) => apiClient.post<BenefitEnrollment>('/benefits/enrollments', payload),
  updateEnrollmentStatus: (id: string, status: BenefitEnrollment['status']) =>
    apiClient.patch<BenefitEnrollment>(`/benefits/enrollments/${id}`, { status }),

  listMyEnrollments: () => apiClient.get<BenefitEnrollment[]>('/me/benefits'),
};
