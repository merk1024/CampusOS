# CampusOS

CampusOS is a web-first academic portal for students, teachers, administrators, and pilot university operations.

It combines courses, schedule, exams, grades, assignments, attendance, announcements, and user management in one branded system with role-based access.

## Current capabilities

- login by email or student ID
- roles: `student`, `teacher`, `admin`, `superadmin`
- course catalog, enrollment, and teacher assignment
- group, subgroup, and individual schedule flows
- exams and grade entry
- assignments and announcements
- attendance management for teachers and attendance history for students
- profile and settings pages
- light and dark theme
- SQLite for local work and PostgreSQL for deployed environments

## Stack

Frontend:

- React 19
- Vite
- CSS-based UI without a large component framework

Backend:

- Node.js
- Express
- JWT authentication

Quality and security:

- `helmet`
- `cors`
- `express-rate-limit`
- `eslint-plugin-security`
- `npm audit`
- local secret scan
- OWASP ZAP baseline script

## Repository layout

```text
CampusOS/
|-- backend/
|-- frontend/
|-- docs/
|-- render.yaml
|-- render.staging.yaml
|-- ROADMAP.md
`-- README.md
```

## Quick start

### 1. Install dependencies

```bash
npm install
npm --prefix backend install
npm --prefix frontend install
```

### 2. Configure environment files

Backend:

- copy `backend/.env.example` to `backend/.env`

Frontend:

- copy `frontend/.env.example` to `frontend/.env`

Additional templates:

- `backend/.env.staging.example`
- `backend/.env.production.example`
- `frontend/.env.staging.example`
- `frontend/.env.production.example`

### 3. Start the app locally

Backend:

```bash
npm run dev:backend
```

Frontend:

```bash
npm run dev:frontend
```

Default local URLs:

- frontend: `http://localhost:5173`
- backend: `http://localhost:5000`
- health: `http://localhost:5000/health`

### 4. Seed the pilot dataset

Set real values for the seed passwords in `backend/.env`, then run:

```bash
npm run seed:demo
```

The seed creates:

- bootstrap owner account
- admin account
- multiple teachers
- 13 students
- course catalog
- enrollments
- group, subgroup, and individual schedule entries

### 5. Reset temporary pilot data

When you need a clean pilot reset:

```bash
npm run cleanup:demo
npm run seed:demo
```

## Key scripts

Root scripts:

- `npm run dev:backend`
- `npm run dev:frontend`
- `npm run seed:demo`
- `npm run cleanup:demo`
- `npm run env:check:staging`
- `npm run env:check:production`
- `npm run verify:web`
- `npm run test:backend`
- `npm run audit:backend`
- `npm run audit:frontend`
- `npm run scan:secrets`
- `npm run scan:zap`
- `npm run export:security-docx`

Backend scripts:

- `npm --prefix backend run seed`
- `npm --prefix backend run cleanup-demo-data`
- `npm --prefix backend run env:check`
- `npm --prefix backend run import:pilot`
- `npm --prefix backend run import:pilot:apply`
- `npm --prefix backend run import:pilot:preview`
- `npm --prefix backend run reconcile:pilot`

## Deploying with Render

Blueprint files are already included:

- `render.yaml` for production
- `render.staging.yaml` for staging

Before your first deploy:

1. set strong values for `JWT_SECRET` and all seed/bootstrap passwords
2. confirm `FRONTEND_URL` matches the deployed frontend domain
3. confirm `VITE_API_BASE_URL` points to the backend `/api`
4. run the env check for the target environment

Render PostgreSQL note:

- if your Render PostgreSQL connection uses a self-signed certificate, set `PGSSL_ALLOW_SELF_SIGNED=true`

Full operations flow:

- see [docs/OPERATIONS_RUNBOOK.md](./docs/OPERATIONS_RUNBOOK.md)

## Data readiness

The pilot import pipeline supports:

- students
- teachers
- courses
- course enrollments
- schedule

Accepted formats:

- CSV
- TSV

Reference files:

- `backend/imports/README.md`
- `docs/DATA_IMPORT_MAPPING.md`

## Product direction

CampusOS is currently being developed as a stable web MVP first.

The next product step is to harden the web experience for a pilot launch. Android or mobile packaging comes after the web platform stops changing rapidly.

## Documentation

- [ROADMAP.md](./ROADMAP.md)
- [docs/OPERATIONS_RUNBOOK.md](./docs/OPERATIONS_RUNBOOK.md)
- [docs/DATA_IMPORT_MAPPING.md](./docs/DATA_IMPORT_MAPPING.md)

## Author

Erbol Abdusaitov

- email: [erbolabdusaito@gmail.com](mailto:erbolabdusaito@gmail.com)
- Telegram: `@merk1024`
