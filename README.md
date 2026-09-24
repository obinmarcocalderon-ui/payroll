# Payroll & Benefits Management System

Full-stack subsystem for the E-Commerce Marketplace HRMS/HCM capstone:
Payroll Management, Compensation Planning, Claims & Reimbursement, HMO &
Benefits Administration, and HR Analytics Dashboard.

```
.
├── docker-compose.yml          ← run this to start everything
├── backend/                    ← Laravel 11 API (PHP, PostgreSQL, Redis, Sanctum)
└── payroll-benefits-system/    ← React + TypeScript + Tailwind frontend
```

No demo/sample data is included anywhere — both sides ship empty and
ready for a real deployment.

## Stack

- **Frontend:** React + TypeScript, Tailwind CSS
- **Backend:** Laravel API (PHP)
- **Database:** PostgreSQL
- **Cache / sessions / queues:** Redis
- **Auth:** Laravel Sanctum
- **Containers:** Docker
- **Version control:** Git + GitHub

## ⚠️ Before you start — folder location matters

**Extract this project OUTSIDE of OneDrive** (or any cloud-synced
folder). A path like `C:\projects\payroll-benefits-system` works.
Running it inside `OneDrive\Desktop\...` can cause random crashes while
Docker or npm write files, because OneDrive tries to sync them at the
same time.

## Quick start

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop)
installed and running.

1. Extract this folder to a non-OneDrive location, e.g. `C:\projects\`.
2. Open that folder in VS Code (`File > Open Folder`).
3. Open a terminal (`Terminal > New Terminal`) and confirm you're in the
   right place:
   ```bash
   dir
   ```
   You should see `backend`, `payroll-benefits-system`, and
   `docker-compose.yml` all at the same level.
4. Run:
   ```bash
   docker compose up --build
   ```
   First run takes a few minutes (installs PHP and npm dependencies,
   runs migrations automatically). Leave this terminal running.

Once it's up:
- Frontend: **http://localhost:5173**
- Backend API: **http://localhost:8000**
- Postgres: `localhost:5432` (user `payroll_user` / db `payroll_benefits`)
- Redis: `localhost:6379`

5. Create your first user so you can log in — open a **second** terminal
   tab and run:
   ```bash
   docker compose exec backend php artisan tinker
   ```
   Then paste:
   ```php
    \App\Models\User::create(['name' => 'HR Admin', 'email' => 'admin@example.com', 'password' => bcrypt('changeme'), 'role' => 'admin']);
   ```
   Type `exit` to leave Tinker. Log in at `http://localhost:5173` with
   `admin@example.com` / `changeme`.

## Version control

```bash
git init
git add .
git commit -m "Initial commit: Payroll & Benefits full stack"
git remote add origin <your-repo-url>
git push -u origin main
```

## What's implemented

Every endpoint the frontend calls has a matching Laravel route,
controller, model, and migration — see `backend/README.md` for the full
route table. JSON responses use camelCase keys to match the frontend's
TypeScript types directly.
