import { apiClient } from './apiClient';
import type { Employee } from '../types';

export const employeeService = {
  list: () => apiClient.get<Employee[]>('/employees'),
  create: (payload: Omit<Employee, 'id'>) => apiClient.post<Employee>('/employees', payload),
  update: (id: string, payload: Partial<Omit<Employee, 'id'>>) =>
    apiClient.patch<Employee>(`/employees/${id}`, payload),
  remove: (id: string) => apiClient.delete<void>(`/employees/${id}`),

  getMe: () => apiClient.get<Employee>('/me/profile'),
  updateMe: (payload: Partial<Pick<Employee, 'phone' | 'address'>>) =>
    apiClient.patch<Employee>('/me/profile', payload),
};
