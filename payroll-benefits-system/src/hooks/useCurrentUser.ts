import { useApiResource } from './useApiResource';
import { apiClient } from '../services/apiClient';
import type { UserRole } from '../types';

export interface CurrentUser {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  employeeId: string | null;
}

export function useCurrentUser() {
  return useApiResource<CurrentUser>(() => apiClient.get<CurrentUser>('/auth/me'), []);
}

export function isAdmin(user: CurrentUser | null | undefined): boolean {
  return user?.role === 'admin';
}