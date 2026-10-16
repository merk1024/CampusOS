# CampusOS Security Policy

CampusOS is an academic operations application developed as a diploma project.
Security tests use disposable data. A passing local suite is not a production
penetration test or a claim of certification.

## Required boundaries

- Students read records within their enrollment and identity scope.
- Teachers manage resources through current course ownership.
- Administrators manage academic records; only superadmins provision admins.
- Self-service profile changes cannot alter academic access or financial fields.
- Logout, password change and account deactivation revoke prior sessions.
- Cookie-authenticated mutations require an explicit trusted browser Origin.
- Grade and attendance changes commit atomically with their audit history.
- Passwords, bearer tokens and database credentials must not appear in logs.

## Reporting

Report suspected vulnerabilities privately to the repository owner. Include the
affected route, required role, reproduction using test accounts, observed impact
and expected behavior. Do not include live credentials or personal student data.

## Verification

Run `npm run verify:web` and `npm run scan:secrets`. The PostgreSQL integration
suite is enabled by `TEST_DATABASE_URL` and must point to a disposable database.
Never run destructive test fixtures against a production database.

## Deployment considerations

Set an exact HTTPS `FRONTEND_URL`, a strong `JWT_SECRET`, and PostgreSQL TLS policy
appropriate to the host. Use `db:bootstrap` for production startup; demo seed is
an explicit operator action. Validate backup restoration before accepting real
academic records. Audit storage is application-managed, not cryptographically
tamper-proof: database administrators remain a separate trust boundary.
