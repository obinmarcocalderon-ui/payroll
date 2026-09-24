import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Employees } from './pages/Employees';
import { TimesheetManagement } from './pages/TimesheetManagement';
import { UserManagement } from './pages/UserManagement';
import { PayrollManagement } from './pages/PayrollManagement';
import { CompensationPlanning } from './pages/CompensationPlanning';
import { ClaimsReimbursement } from './pages/ClaimsReimbursement';
import { HmoBenefits } from './pages/HmoBenefits';
import { Login } from './pages/Login';
import { authService } from './services/auth.service';
import { useCurrentUser, isAdmin } from './hooks/useCurrentUser';

function RequireAuth({ children }: { children: ReactNode }) {
  if (!authService.hasToken()) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: ReactNode }) {
  const { data: user, loading } = useCurrentUser();
  if (loading) return null;
  if (!isAdmin(user)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/employees"
          element={
            <RequireAuth>
              <Employees />
            </RequireAuth>
          }
        />
        <Route
          path="/users"
          element={
            <RequireAuth>
              <RequireAdmin>
                <UserManagement />
              </RequireAdmin>
            </RequireAuth>
          }
        />
        <Route
          path="/attendance"
          element={
            <RequireAuth>
              <TimesheetManagement />
            </RequireAuth>
          }
        />
        <Route
          path="/payroll"
          element={
            <RequireAuth>
              <PayrollManagement />
            </RequireAuth>
          }
        />
        <Route
          path="/compensation"
          element={
            <RequireAuth>
              <CompensationPlanning />
            </RequireAuth>
          }
        />
        <Route
          path="/claims"
          element={
            <RequireAuth>
              <ClaimsReimbursement />
            </RequireAuth>
          }
        />
        <Route
          path="/benefits"
          element={
            <RequireAuth>
              <HmoBenefits />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;