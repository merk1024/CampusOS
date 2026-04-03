# CampusOS Operations Runbook

## Purpose

This runbook defines the predictable flow for local development, staging checks, demo data reset, and Render deployment.

## Environment files

Backend templates:

- `backend/.env.example` for local SQLite development
- `backend/.env.staging.example` for staging
- `backend/.env.production.example` for production

Frontend templates:

- `frontend/.env.example` for local development
- `frontend/.env.staging.example` for staging
- `frontend/.env.production.example` for production

## Local development flow

1. Copy env templates:
   - `backend/.env.example` -> `backend/.env`
   - `frontend/.env.example` -> `frontend/.env`
2. Install dependencies:
   - `npm install`
   - `npm --prefix backend install`
   - `npm --prefix frontend install`
3. Start services:
   - `npm run dev:backend`
   - `npm run dev:frontend`
4. Seed demo data when needed:
   - `npm run seed:demo`

## Staging and production env checks

Run the backend env validator before deploys:

- `npm run env:check:staging`
- `npm run env:check:production`

For local file-based checks you can run:

- `node backend/scripts/validate-env.js --mode=staging --env-file=.env.staging.local`
- `node backend/scripts/validate-env.js --mode=production --env-file=.env.production.local`

## Demo data lifecycle

Use `seed` to bootstrap the pilot dataset.

- `npm run seed:demo`

Use cleanup only when you want to remove temporary pilot data before reseeding.

- `npm run cleanup:demo`

Recommended order for a full reset:

1. `npm run cleanup:demo`
2. `npm run seed:demo`
3. `npm run verify:web`

## Background jobs and notifications

CampusOS now includes a lightweight job queue for notification fan-out and import summaries.

Run the worker manually when needed:

- `npm run jobs:work`
- `npm --prefix backend run jobs:work`

Recommended usage:

1. Trigger the worker after bulk imports, announcement publishing, or manual integration analysis.
2. Check `/api/ops/jobs` to confirm queue status.
3. Check `/api/ops/notifications/me` or the database inbox table for delivered notifications.

## Render deploy flow

Blueprint files:

- `render.yaml` for production
- `render.staging.yaml` for staging
- `.github/workflows/render-deploy-gate.yml` for gated releases

Recommended deploy checklist:

1. Validate backend env values.
2. Confirm frontend API base URL matches the correct backend `/api`.
3. Confirm backend `FRONTEND_URL` matches the deployed frontend domain.
4. Confirm bootstrap passwords are set.
5. Confirm Render `Auto-Deploy` is disabled for the services controlled by the deploy gate.
6. Confirm the matching GitHub environment contains:
   - `RENDER_API_DEPLOY_HOOK_URL`
   - `RENDER_FRONTEND_DEPLOY_HOOK_URL`
7. Trigger `CampusOS Render Deploy Gate` from GitHub Actions.
8. Verify `/health`, `/ready`, and login after deploy.

Recommended GitHub environment mapping:

- `staging` environment -> staging Render service hooks
- `production` environment -> production Render service hooks

Recommended release protection:

1. Require `CampusOS CI` checks before merging to `main`.
2. Add manual reviewers to the `production` GitHub environment.
3. Use the gated workflow instead of direct manual deploys whenever possible.

## Render PostgreSQL SSL note

If Render PostgreSQL uses a self-signed certificate in your environment, set:

- `PGSSL_ALLOW_SELF_SIGNED=true`

If you need an explicit temporary fallback during troubleshooting:

- `PGSSLMODE=disable`

Do not leave conflicting values like `PGSSL_REJECT_UNAUTHORIZED=true` together with the self-signed override.

## Monitoring and error reporting

CampusOS supports optional webhook-based error monitoring:

- set `MONITORING_WEBHOOK_URL` if you want backend and client errors forwarded to an external alert destination

Useful endpoints and flows:

- `/health` for basic uptime checks
- `/ready` for DB-backed readiness checks
- `/api/monitoring/frontend-error` for authenticated client-side error reports
- `X-Request-Id` response header for tracing individual failures in logs

Recommended verification:

1. Confirm request IDs appear in deploy logs.
2. Confirm at least one handled backend error reaches the monitoring webhook if enabled.
3. Confirm at least one client error report is written through the monitoring route.

## Backup and restore

Use the dedicated scripts for backup and restore:

- `npm run backup:campusos -- -Mode sqlite`
- `npm run backup:campusos -- -Mode postgres`
- `npm run restore:campusos -- -Mode sqlite -InputPath <path>`
- `npm run restore:campusos -- -Mode postgres -InputPath <path>`

Full procedure:

- see [BACKUP_RESTORE_PLAYBOOK.md](./BACKUP_RESTORE_PLAYBOOK.md)

## Release security checklist

Before staging or production releases:

- see [SECURITY_RELEASE_CHECKLIST.md](./SECURITY_RELEASE_CHECKLIST.md)

## Verification

Run the web verification bundle before a release candidate:

- `npm run verify:web`

This checks:

- backend tests
- frontend lint
- frontend production build

After a gated deploy, verify:

- `GET /health` returns `status = ok`
- `GET /ready` returns `status = ready`
- backend and frontend are both on the expected domain
- login still works for at least one seeded admin or pilot account
