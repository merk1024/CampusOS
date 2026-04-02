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
