import { apiClient } from './apiClient';
import type { SystemUser, UserRole } from '../types';

export const userService = {
  list: () => apiClient.get<SystemUser[]>('/users'),
  create: (payload: { name: string; email: string; password: string; role: UserRole; employeeId?: string | null }) =>
    apiClient.post<SystemUser>('/users', payload),
  update: (
    id: string,
    payload: Partial<{ name: string; email: string; role: UserRole; password: string; employeeId: string | null }>
  ) => apiClient.patch<SystemUser>(`/users/${id}`, payload),
  remove: (id: string) => apiClient.delete<void>(`/users/${id}`),
};