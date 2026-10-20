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

## Login audit and browser checks

Login addresses use Express `req.ip` and its configured proxy policy. Set
`TRUST_PROXY=false` for direct connections. Enabled proxy trust currently means
one trusted hop; deploy behind that topology and prevent direct backend access.
Do not use arbitrary `X-Forwarded-For` values as evidence of a client address.
Rejected login credentials, disabled accounts and invalid login payloads create
`auth/login-failed` events with a reason and client IP. No submitted login,
password or token is stored; the actor is null because authentication failed.
These records cover requests reaching the login handler, not requests rejected
earlier by rate limiting, CORS or body parsing.

Install Chromium once with `cd frontend && npx playwright install chromium`,
then run `npm run test:e2e` from the repository root. The suite starts its own
server at `127.0.0.1:4178`, builds into a temporary directory and seeds an
in-memory SQLite database. It refuses to reuse an existing server. Desktop and
mobile Chromium exercise the real login form, cookie persistence, role-specific
navigation, API authorization and logout. Browser results go to the OS temporary
directory. This does not cover all browsers or replace PostgreSQL integration.

## ZAP baseline

`npm run scan:zap -- -TargetUrl http://localhost:5000/` targets an already running
test instance. Host loopback URLs are translated to `host.docker.internal` for
the Docker scanner; other explicit URLs and `ZAP_TARGET_URL` remain supported.
Choose an isolated instance with synthetic data. The baseline is an
unauthenticated passive scan of discoverable pages, not a role-aware penetration
test. A health endpoint alone gives almost no application coverage.

Exit codes are 0 for success, 1 for failed checks, 2 for warnings and 3 for
unavailable infrastructure or scanner errors. Skipped scans fail, and the fixed
report filenames are cleared before each run to prevent stale success reports.
# Frontend deployment headers

The static frontend is a separate Render service: API Helmet middleware cannot
protect its HTML or assets. Both `render.yaml` and `render.staging.yaml` set
global response headers using Render's static-site `headers` configuration.
Apply the corresponding Blueprint when deploying; an independently configured
service needs the same headers in its Render settings.

CSP permits scripts only from the frontend origin, blocks framing and embedded
objects, and restricts connections to the same origin and the environment's API.
Google Fonts remain allowed. Inline **styles** remain enabled for React's dynamic
styles; inline scripts and eval are not allowed. HTTPS images remain allowed for
user-provided avatar URLs. If the API hostname changes, update `connect-src`
together with `VITE_API_BASE_URL`.

Other headers disable MIME sniffing, restrict referrer disclosure and browser
permissions, isolate opened windows, and enable HSTS on HTTPS. HSTS deliberately
does not opt sibling domains into enforcement. COEP is not enabled because
third-party avatars may not provide compatible cross-origin resource headers.

Browser tests load headers directly from the selected Blueprint and verify HTML,
SPA routes, assets, and rejection of an injected inline script, alongside real
role workflows. Run `npm run test:e2e`; set `E2E_BLUEPRINT=render.staging.yaml`
to repeat with staging settings. CI runs both. The local fixture uses same-origin
API requests, so live TLS, CDN header delivery, and cross-origin cookie/CORS
behavior must still be checked after deployment. Local ZAP scans cover this
fixture, not a live Render deployment.
