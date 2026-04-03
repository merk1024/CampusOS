# CampusOS Release Security Checklist

## Before release

1. Confirm `JWT_SECRET` is rotated away from any placeholder value.
2. Confirm `AUTH_COOKIE_SECURE=true` in staging and production.
3. Confirm `AUTH_COOKIE_SAMESITE` matches the deployed frontend/API topology.
4. Confirm `FRONTEND_URL` and `VITE_API_BASE_URL` point to the correct environment.
5. Confirm `PGSSL_REJECT_UNAUTHORIZED` or `PGSSL_ALLOW_SELF_SIGNED` is intentionally configured.

## Secrets and credentials

1. Run `npm run scan:secrets`.
2. Confirm bootstrap passwords are set through environment variables, not source files.
3. Confirm `SUPERADMIN_BOOTSTRAP_PASSWORD`, `SEED_ADMIN_PASSWORD`, `SEED_TEACHER_PASSWORD`, and `SEED_STUDENT_PASSWORD` are not placeholders.
4. Confirm `DATABASE_URL` is not printed in logs or documentation.

## Dependency and app security

1. Run `npm run audit:backend`.
2. Run `npm run audit:frontend`.
3. Run `npm run scan:zap` if the target environment is reachable.
4. Review recent changes touching auth, file import, or role-based access.

## Operational readiness

1. Run `npm run verify:web`.
2. Confirm `/health` returns `status = ok`.
3. Confirm `/ready` returns `status = ready`.
4. Confirm job worker behavior if `notification.broadcast` or `import.summary` jobs are queued.
5. Confirm monitoring webhook or error reporting path is configured if used.

## Post-deploy checks

1. Log in with an admin account.
2. Confirm logout clears the browser session.
3. Confirm at least one admin action creates a `system_audit_log` row.
4. Confirm one notification job can be processed from `job_queue`.
5. Confirm error logs and request IDs are visible in the deploy platform logs.
