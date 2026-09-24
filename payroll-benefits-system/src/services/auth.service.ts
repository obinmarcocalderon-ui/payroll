import { apiClient, AUTH_TOKEN_KEY } from './apiClient';
import type { CurrentUser } from '../hooks/useCurrentUser';

export interface LoginSuccess {
  token: string;
  user: CurrentUser;
}

export interface OtpChallenge {
  otp_required: true;
  email_hint: string;
}

export type LoginResponse = LoginSuccess | OtpChallenge;

export function isOtpChallenge(res: LoginResponse): res is OtpChallenge {
  return 'otp_required' in res && res.otp_required === true;
}

export const authService = {
  login: (employeeNumber: string, password: string) =>
    apiClient.post<LoginResponse>('/auth/login', {
      employee_number: employeeNumber,
      password,
    }),

  verifyOtp: (employeeNumber: string, code: string) =>
    apiClient.post<LoginSuccess>('/auth/verify-otp', {
      employee_number: employeeNumber,
      code,
    }),

  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  },

  saveToken: (token: string) => {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  },

  hasToken: () => Boolean(localStorage.getItem(AUTH_TOKEN_KEY)),
};