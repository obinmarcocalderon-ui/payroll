import type { ReactNode } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { authService } from '../../services/auth.service';
import { useCurrentUser } from '../../hooks/useCurrentUser';
import type { UserRole } from '../../types';

/**
 * Central authentication guard for the React router. Any route nested
 * under <Route element={<RequireAuth />}> requires a stored token;
 * unauthenticated visitors are redirected to /login. Actual API
 * authorization is enforced by the backend — this guard only keeps
 * unauthenticated users out of the app shell.
 */
export function RequireAuth() {
  if (!authService.hasToken()) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

/**
 * Role gate for admin-only pages (e.g. /users). Complements — never
 * replaces — the backend's role middleware, which is the real
 * enforcement point.
 */
export function RequireRole({ role, children }: { role: UserRole; children: ReactNode }) {
  const { data: user, loading } = useCurrentUser();

  if (loading) return null;

  if (user?.role !== role) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
