# Payroll & Benefits Management System — Frontend

Frontend for the **Payroll & Benefits** subsystem of the E-Commerce Marketplace
HRMS/HCM system (capstone scope: Payroll Management, Compensation Planning,
Claims & Reimbursement, HMO & Benefits Administration, HR Analytics Dashboard).

This is a **frontend-only** deliverable. It ships with no seed/sample data —
every screen renders proper empty, loading, and error states until it's
connected to the team's centralized backend API.

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript (Vite) |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Routing | React Router |
| Database | PostgreSQL (owned by the centralized backend) |
| Cache | Redis (owned by the centralized backend) |
| Containerization | Docker |
| Version control | Git / GitHub |

The frontend does **not** talk to PostgreSQL/Redis directly — it only calls
the centralized backend's REST API. Postgres and Redis containers are
included in `docker-compose.yml` purely so this subsystem can be demoed
end-to-end during development, ahead of backend integration.

## Getting started

```bash
npm install
cp .env.example .env      # set VITE_API_BASE_URL to your backend
npm run dev                # http://localhost:5173
```

### Build for production

```bash
npm run build              # outputs to dist/
npm run preview            # preview the production build locally
```

### Run with Docker

This frontend is meant to be run together with the backend via the
**root-level** `docker-compose.yml` (one level up, alongside the
`backend/` folder):

```bash
cd ..                      # into the folder containing backend/ and payroll-benefits-system/
docker compose up --build
```

This starts Postgres, Redis, the Laravel API (`http://localhost:8000`),
and this frontend (`http://localhost:5173`).

If you only want to build a standalone production image of the frontend
(no backend/db), the `Dockerfile` here still works on its own:
```bash
docker build -t payroll-benefits-frontend .
docker run -p 8080:80 payroll-benefits-frontend
```

## Project structure

```
src/
  types/            Domain types shared across the app (Employee, PayrollRun,
                     Payslip, SalaryGrade, Claim, BenefitPlan, etc.)
  services/         One file per module — thin wrappers around apiClient
                     that define the exact REST endpoints this frontend
                     expects from the backend.
  services/apiClient.ts   Centralized fetch wrapper (base URL, auth header,
                           error handling).
  hooks/            useApiResource (generic fetch/loading/error hook),
                     useCurrentUser.
  components/
    layout/         Sidebar, Topbar, Layout shell.
    common/         DataTable, Modal, StatusBadge, StatCard, EmptyState,
                     LoadingState/ErrorState, form fields.
  pages/            One page per module:
                     Dashboard.tsx
                     PayrollManagement.tsx
                     CompensationPlanning.tsx
                     ClaimsReimbursement.tsx
                     HmoBenefits.tsx
                     HrAnalytics.tsx
```

## Expected backend API

All requests are made relative to `VITE_API_BASE_URL`. Adjust
`src/services/*.service.ts` if your backend's routes differ.

| Module | Endpoints |
|---|---|
| Auth | `GET /auth/me` |
| Payroll | `GET/POST /payroll/runs`, `GET /payroll/runs/:id`, `POST /payroll/runs/:id/approve`, `POST /payroll/runs/:id/release`, `GET /payroll/runs/:id/payslips`, `GET /payroll/payslips/:id` |
| Compensation | `GET/POST /compensation/salary-grades`, `PATCH/DELETE /compensation/salary-grades/:id`, `GET/POST /compensation/adjustments`, `PATCH /compensation/adjustments/:id` |
| Claims | `GET/POST /claims`, `GET /claims/:id`, `PATCH /claims/:id`, `POST /claims/:id/reimburse` |
| Benefits | `GET/POST /benefits/plans`, `PATCH /benefits/plans/:id`, `GET/POST /benefits/enrollments`, `PATCH /benefits/enrollments/:id` |
| Analytics | `GET /analytics/summary` (see `AnalyticsSummary` in `src/types/index.ts` for the exact response shape) |

Authentication: the client reads a bearer token from
`localStorage.getItem('pbms_auth_token')` and attaches it as
`Authorization: Bearer <token>` on every request. Wire up your login flow to
store the token there (or swap in your team's shared auth approach).

## Git workflow

```bash
git init
git add .
git commit -m "Initial scaffold: Payroll & Benefits frontend"
git remote add origin <your-repo-url>
git push -u origin main
```

Suggested branching: `main` (stable) → `develop` → feature branches per
module (`feature/payroll-runs`, `feature/claims-review`, etc.).

## Notes for the client / next developer

- No mock or sample data is seeded anywhere — every table starts empty by
  design so this is ready to connect to a live database.
- Every list view has loading, error (with retry), and empty states already
  built in via `useApiResource`, `LoadingState`, `ErrorState`, and
  `EmptyState`.
- Currency is formatted as PHP (₱) via `src/utils/format.ts` — change the
  locale/currency there if needed.
