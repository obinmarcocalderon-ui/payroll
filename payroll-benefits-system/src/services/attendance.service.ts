import { apiClient } from './apiClient';
import type { AttendanceSheetRow, AttendanceRecord, AttendanceSummaryRow } from '../types';

export const attendanceService = {
  getSheet: (start: string, end: string) =>
    apiClient.get<AttendanceSheetRow[]>(`/attendance/sheet?start=${start}&end=${end}`),
  saveDay: (payload: {
    employeeId: string;
    date: string;
    status: 'present' | 'absent' | 'day_off';
    minutesLate: number;
    overtimeMinutes: number;
  }) => apiClient.post<AttendanceRecord>('/attendance/sheet', payload),
   getSummary: (start: string, end: string) =>
    apiClient.get<AttendanceSummaryRow[]>(`/attendance/summary?start=${start}&end=${end}`),
};