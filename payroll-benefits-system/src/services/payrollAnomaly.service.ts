import { apiClient } from './apiClient';
import type { AnomalyStatus, PayrollAnomaly } from '../types';

export const payrollAnomalyService = {
  list: (payrollRunId: string) =>
    apiClient.get<PayrollAnomaly[]>(`/payroll/runs/${payrollRunId}/anomalies`),
  rescan: (payrollRunId: string) =>
    apiClient.post<PayrollAnomaly[]>(`/payroll/runs/${payrollRunId}/anomalies/rescan`),
  updateStatus: (payrollRunId: string, anomalyId: string, status: AnomalyStatus) =>
    apiClient.patch<PayrollAnomaly>(`/payroll/runs/${payrollRunId}/anomalies/${anomalyId}`, { status }),
};
