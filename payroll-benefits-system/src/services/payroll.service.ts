import { apiClient } from './apiClient';
import type { PayrollRun, Payslip, AttendanceSummary, AttendanceRecord, AttendanceSheetRow } from '../types';

export const payrollService = {
  listRuns: (includeArchived = false) =>
    apiClient.get<PayrollRun[]>(`/payroll/runs${includeArchived ? '?includeArchived=1' : ''}`),
  getRun: (id: string) => apiClient.get<PayrollRun>(`/payroll/runs/${id}`),
  createRun: (payload: Pick<PayrollRun, 'payPeriodStart' | 'payPeriodEnd' | 'payDate' | 'cutoffLabel'>) =>
    apiClient.post<PayrollRun>('/payroll/runs', payload),
  approveRun: (id: string) => apiClient.post<PayrollRun>(`/payroll/runs/${id}/approve`),
  releaseRun: (id: string) =>
    apiClient.post<PayrollRun & { emailSummary: { emailed: number; failed: number } }>(
      `/payroll/runs/${id}/release`
    ),
  archiveRun: (id: string) => apiClient.post<PayrollRun>(`/payroll/runs/${id}/archive`),
  unarchiveRun: (id: string) => apiClient.post<PayrollRun>(`/payroll/runs/${id}/unarchive`),
  deleteRun: (id: string) => apiClient.delete<void>(`/payroll/runs/${id}`),

  listAttendance: (payrollRunId: string) =>
    apiClient.get<AttendanceSummary[]>(`/payroll/runs/${payrollRunId}/attendance`),
  saveAttendance: (
    payrollRunId: string,
    payload: {
      employeeId: string;
      daysPresent: number;
      lateMinutes: number;
      overtimeHours: number;
      unpaidAbsenceDays: number;
      cashAdvance: number;
      taxRefund: number;
      slCashConversion: number;
    }
  ) => apiClient.post<AttendanceSummary>(`/payroll/runs/${payrollRunId}/attendance`, payload),
    listAttendanceRecords: (payrollRunId: string) =>
    apiClient.get<AttendanceSheetRow[]>(`/payroll/runs/${payrollRunId}/attendance-records`),
  saveAttendanceRecord: (
    payrollRunId: string,
    payload: { employeeId: string; date: string; status: 'present' | 'absent' | 'day_off'; minutesLate: number; overtimeMinutes: number }
  ) => apiClient.post<AttendanceRecord>(`/payroll/runs/${payrollRunId}/attendance-records`, payload),
  computeRun: (payrollRunId: string) => apiClient.post<PayrollRun>(`/payroll/runs/${payrollRunId}/compute`),

  listPayslips: (payrollRunId: string) =>
    apiClient.get<Payslip[]>(`/payroll/runs/${payrollRunId}/payslips`),
  getPayslip: (id: string) => apiClient.get<Payslip>(`/payroll/payslips/${id}`),
  listMyPayslips: () => apiClient.get<Payslip[]>('/me/payslips'),
  sendPayslip: (id: string, channel: 'email' | 'sms') =>
    apiClient.post<{ payslipId: string; status: 'sent' | 'failed'; message: string }>(
      `/payroll/payslips/${id}/send`,
      { channel }
    ),
  sendPayslipsBulk: (payrollRunId: string, payslipIds: string[], channel: 'email' | 'sms') =>
    apiClient.post<{ sent: number; failed: number; results: { payslipId: string; status: string; message: string }[] }>(
      `/payroll/runs/${payrollRunId}/payslips/send-bulk`,
      { payslipIds, channel }
    ),
};
