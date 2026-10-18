# Administrator MFA design

Status: implemented locally with opt-in rollout, pending publication and operational
configuration. Production enforcement is not authorized.

## Goal and scope

Protect administrator and superadministrator accounts with an authenticator app
(TOTP) and single-use recovery codes. Retain React, Express and PostgreSQL, with
SQLite support for local development and tests. Students and teachers retain
their existing sign-in flow. No PMS/OCS integration changes are included.

The agreed recovery policy is recovery codes for superadministrators, and either
recovery codes or an audited superadministrator reset for ordinary administrators.
Email alone cannot reset MFA. There is no public account recovery endpoint.

## Sign-in boundary

1. Validate account status and password using the existing login flow.
2. For an enrolled administrator, issue a random opaque challenge lasting five
   minutes. Do not issue a session cookie or bearer token at this step.
3. Verify a TOTP or recovery code against that challenge. A challenge identifies
   one account, captures its session version and remembered-login preference,
   and has a fixed expiry and an attempt budget of five.
4. In a transaction, recheck the active account, role, session version and MFA
   configuration, consume the challenge and verification evidence, and append
   an audit event. Only then issue the existing full session.

Challenges are stored as hashes, never raw values. They cannot authenticate
ordinary API requests. Expired, consumed, revoked and exhausted challenges fail
closed. Database-level conditional writes or row locks prevent concurrent reuse.
Rate limits apply to challenge creation and verification; attempts are persisted
so restarting the process does not reset the budget. Attempts at replay and
verification failures generate sanitized audit events.

An enabled administrator session must carry a verified-MFA claim. Authorization
rechecks the account's current configuration so password-only tokens cannot bypass
MFA. Enabling, disabling, resetting or rotating MFA increments session_version
and invalidates pending challenges and previous cookies/bearer sessions.

## Enrollment and credentials

Enrollment requires current-password reauthentication. A pending enrollment is
short-lived and distinct from active MFA. The UI presents the provisioning URI
as a QR code with a manual key alternative. The user must prove possession with
a TOTP before enrollment becomes active. Concurrent enrollment requests cannot
overwrite an already-enabled factor without explicit authenticated replacement.

TOTP verification permits a small clock-skew window and records the last consumed
time step atomically to reject replay. Verify against published test vectors and
review the chosen maintained library/API before implementation.

Encrypt TOTP secrets using authenticated encryption and a separate server-only
MFA_ENCRYPTION_KEY, not JWT_SECRET. Specify and validate its format at startup.
Missing or invalid key configuration must never downgrade enrolled accounts to
password-only login. Key loss requires controlled operational recovery, not an
email reset. Backup and deployment documentation must explain this dependency.

Generate ten cryptographically random recovery codes and show them once after
activation. Store only one-way hashes. Consumption is atomic, including concurrent
requests. Codes are not included in subsequent profile/status responses, logs,
browser persistent storage or monitoring reports. Sensitive responses use
Cache-Control: no-store; errors do not echo credential-bearing input.

## Recovery and management

A recovery code completes a password-verified sign-in and is consumed exactly
once. The UI reports the remaining count and encourages factor replacement.
Regenerating codes or disabling/replacing MFA requires fresh password plus a
current second factor or a single-use recovery proof scoped to that operation.
An existing session by itself is insufficient.

A superadministrator may reset MFA only for an ordinary administrator. Require
fresh password and second-factor verification by the acting superadministrator,
check target privileges again inside the transaction, and audit actor and target.
Reset revokes the target's sessions/challenges and places it in re-enrollment,
not unrestricted password-only access when enforcement is enabled.

No administrator, including another superadministrator, can use this endpoint
to reset a superadministrator. Losing both the authenticator and all recovery
codes requires a documented, operator-controlled recovery procedure outside
the public API. No seed script silently disables or resets an enrolled factor.

## Safe rollout

MFA enrollment is initially opt-in for administrators while deployment keys and
recovery backups are established. Once enabled for an account, the second factor
is always required, regardless of the global enrollment-enforcement setting.

Provide an explicit administrator-enforcement setting for the later rollout.
When enforced, password-verified but unenrolled administrators receive only a
restricted enrollment challenge, usable for setup/confirmation and no other API.
Enforcement checks apply to existing sessions too, avoiding a legacy-token bypass.
Do not enable enforcement or alter production secrets automatically during this
task. Document enrolling the owner, checking recovery codes and verifying a second
browser login before enforcement. An enforcement rollback does not disable factors
that are already active.

## UI and audit

Extend LoginPage with a second-factor step and recovery-code option. Provide a
profile MFA panel for enrollment, status and code regeneration. Expose reset only
to superadministrators in user management, with explicit reauthentication.

Record enrollment, verification failure, recovery-code consumption, regeneration,
disable and administrative reset without passwords, tokens, OTPs, secret keys,
provisioning URIs or code hashes. Display sanitized events in Security Center.
The existing suspicious-login rules can incorporate a distinct MFA failure rule;
do not silently conflate password failures and MFA failures.

## Verification and acceptance

- Password alone cannot create a full session for enrolled administrators.
- Login challenge tokens are rejected by every protected API.
- Incorrect codes exhaust a challenge; expiry and session revocation invalidate it.
- Concurrent TOTP, challenge and recovery-code reuse succeeds at most once.
- Role/status changes and administrative reset are rechecked transactionally.
- Enrollment confirmation and its audit entry roll back together on audit failure.
- Ordinary administrators cannot reset other accounts; superadmin reset is denied.
- Missing encryption keys fail closed without exposing secrets.
- Browser tests cover enrollment, MFA sign-in, recovery and unauthorized reset.
- Repeat database-level integration tests on disposable PostgreSQL and SQLite.
- Existing authorization/session tests, lint and production build remain passing.

## Not included

WebAuthn, SMS/email OTP, SSO, per-device session management, production rollout,
external recovery support and a claim of phishing-resistant authentication.
TOTP adds a factor but remains vulnerable to real-time phishing.
