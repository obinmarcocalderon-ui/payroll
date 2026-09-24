import { apiClient } from './apiClient';
import type { SalaryGrade, CompensationAdjustment } from '../types';

export const compensationService = {
  listSalaryGrades: () => apiClient.get<SalaryGrade[]>('/compensation/salary-grades'),
  createSalaryGrade: (payload: Omit<SalaryGrade, 'id'>) =>
    apiClient.post<SalaryGrade>('/compensation/salary-grades', payload),
  updateSalaryGrade: (id: string, payload: Partial<Omit<SalaryGrade, 'id'>>) =>
    apiClient.patch<SalaryGrade>(`/compensation/salary-grades/${id}`, payload),
  deleteSalaryGrade: (id: string) => apiClient.delete<void>(`/compensation/salary-grades/${id}`),

  listAdjustments: () => apiClient.get<CompensationAdjustment[]>('/compensation/adjustments'),
  createAdjustment: (
    payload: Omit<CompensationAdjustment, 'id' | 'status' | 'requestedAt'>
  ) => apiClient.post<CompensationAdjustment>('/compensation/adjustments', payload),
  decideAdjustment: (id: string, decision: 'approved' | 'rejected') =>
    apiClient.patch<CompensationAdjustment>(`/compensation/adjustments/${id}`, { status: decision }),
};
