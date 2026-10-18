# Administrator MFA Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Track steps with checkboxes and verify every security boundary.

**Goal:** Add administrator TOTP authentication, single-use recovery codes and audited recovery without locking out current production users.

**Architecture:** Separate password verification from full session issuance. Persist hashed, scoped challenges and encrypted factors; perform consumption, session revocation and audit writes transactionally. Extend the existing login and profile flows rather than building a separate identity system.

**Tech Stack:** React, Express, Node crypto, SQLite and PostgreSQL; review current official documentation before selecting TOTP and local QR-rendering dependencies.

**Spec:** `docs/MFA_DESIGN.md`.

**Execution:** Core implementation completed locally. See
`docs/MFA_IMPLEMENTATION_LEDGER.md` for actual verification and review results.
The step lists below preserve the original implementation brief.

## Global Constraints

- No PMS/OCS integration changes are included.
- Students and teachers retain their existing sign-in flow.
- Challenges last five minutes and have an attempt budget of five.
- Generate ten cryptographically random recovery codes and show them once.
- Store only hashes of challenge/recovery tokens and encrypt TOTP secrets with a separate MFA_ENCRYPTION_KEY.
- Opt-in enrollment initially; never disable an enrolled factor when enforcement is off.
- No production secrets, enforcement settings, commits or pushes are changed without authorization.
- Preserve existing uncommitted security work in the current checkout.

## Review Focus

- Parallel requests must not consume one challenge, TOTP time step or recovery code twice.
- Role, account status, factor changes and session revocation must invalidate stale proofs.
- Missing keys, invalid ciphertext and audit-storage errors must fail closed without secret disclosure.
- Browser reload, expired enrollment and lost factors must have explicit recovery instructions, not silent bypasses.
- Enforcement must restrict old sessions and unenrolled administrators without disabling recovery enrollment.

## Task 1: Storage and credential primitives

**Files:** Create `backend/security/mfaCrypto.js`, `backend/tests/mfa-crypto.test.js` and `backend/tests/helpers/mfaSecurity.js`; modify `backend/config/database.js`, `backend/scripts/validate-env.js`, backend environment examples and `backend/tests/postgres-smoke.test.js`.

**Interfaces:** `encryptSecret(secret, accountId)`, `decryptSecret(ciphertext, accountId)`, `hashOpaqueToken(token)` and `verifyTotp(secret, code, now)` returning a matched step or null. Account binding is authenticated encryption associated data. Key format: base64 representing exactly 32 bytes. Provisioning: six digits, 30-second period, a documented interoperable algorithm and at most one adjacent step of skew.

- [ ] Write failing primitive tests: published TOTP vectors, malformed OTPs, tampered ciphertext, wrong account binding and missing/invalid key.
- [ ] Run `node --test tests/mfa-crypto.test.js` in backend and verify the failures before product implementation.
- [ ] Add a versioned migration for factors, pending enrollment, hashed scoped challenges and recovery-code hashes with uniqueness constraints and bounded expiry cleanup. Use the existing migration mechanism for both adapters.
- [ ] Implement primitives using reviewed dependencies and authenticated encryption; do not hand-roll a new cryptographic algorithm.
- [ ] Verify fresh/existing database migrations, seed preservation of enrolled factors, and SQLite/PostgreSQL primitive/storage tests.

## Task 2: Enrollment and second-factor sign-in

**Files:** Create `backend/services/mfaService.js`, `backend/routes/mfa.js`, `backend/tests/mfa-api.test.js`; modify `backend/routes/auth.js`, `backend/middleware/auth.js`, `backend/server.js` and helper tests.

**Interfaces:** `beginEnrollment`, `confirmEnrollment`, `createLoginChallenge`, `verifyLoginChallenge`, and `getMfaStatus`. Login returns `{mfaRequired:true, challenge, expiresAt}` without user/session credentials when a second factor is required. `POST /api/auth/mfa/verify` accepts challenge and one verification method. Protected management routes live under `/api/auth/mfa`.

- [ ] Write failing API tests for password-only denial, absent cookies/token before verification, challenge rejection by protected routes, expiry, five failures and revoked/inactive accounts.
- [ ] Implement pending enrollment with password reauthentication and possession confirmation. Generate codes only on successful activation; respond with no-store and no echoed credential input.
- [ ] Extract shared full-session issuance from login so successful MFA preserves existing cookie, remembered-login and development token-response behavior.
- [ ] Add scoped challenge verification with transactional conditional consumption and an MFA-verified session claim checked by middleware.
- [ ] Test concurrent challenge/TOTP reuse, account changes between steps and audit-failure rollback on both databases.

## Task 3: Recovery, reset and rollout controls

**Files:** Extend `backend/services/mfaService.js`, `backend/routes/mfa.js`, test helpers and `backend/services/securityAuditService.js`; create `docs/MFA_OPERATIONS.md`.

**Interfaces:** `consumeRecoveryCode`, `regenerateRecoveryCodes`, `disableMfa`, `resetAdministratorMfa`. Management proof is fresh password plus TOTP or a single-use, operation-scoped recovery proof. Reset targets an ordinary administrator only, with acting superadministrator reauthentication.

- [ ] Write failing tests for concurrent recovery reuse, secret-free status/audit responses, forbidden reset of any superadmin and forbidden ordinary-admin reset.
- [ ] Implement code hashing/consumption, regeneration and disable/reset with atomic session-version increments and challenge revocation.
- [ ] Add explicit MFA_REQUIRE_ADMIN_ENROLLMENT setting, default false. Enforced unenrolled accounts get enrollment-only challenges; legacy full sessions are denied without verified enrollment.
- [ ] Add sanitized MFA events and a distinct suspicious-MFA-failure rule, with threshold tests independent of password failures.
- [ ] Verify lost-key behavior and document owner enrollment, recovery-code backup, key backup, operator-controlled owner recovery and staged Render rollout. Do not activate enforcement during development.

## Task 4: Browser flows and final verification

**Files:** Modify `frontend/src/components/LoginPage.jsx`, `frontend/src/components/Profile.jsx`, `frontend/src/api.js` and the existing user-management component; create `frontend/src/components/MfaSettings.jsx` and `frontend/e2e/mfa.spec.mjs`; update test fixtures and documentation.

**Interfaces:** LoginPage retains `onLogin` only for completed authentication. New API methods map the enrollment/status/verification/recovery endpoints. MfaSettings keeps provisioning information and recovery codes in transient component state only.

- [ ] Write a failing browser enrollment/login/recovery scenario against the isolated backend; confirm the expected failure before UI implementation.
- [ ] Add localized second-factor/recovery input, cancellation and expired-challenge handling. Never persist password, challenge, provisioning URI or recovery codes to browser storage.
- [ ] Add profile setup with locally generated QR/manual key, one-time code display and explicit regeneration confirmation.
- [ ] Add superadmin-only reset UI with fresh reauthentication and clear target-account effects. Server tests remain the authority for access checks.
- [ ] Verify browser reload clears transient credentials, errors are accessible, desktop/mobile layouts work and no client monitoring payload contains secret input.
- [ ] Run backend full suite, disposable PostgreSQL suite, frontend lint/build and all browser tests. Record actual results and residual risks; do not claim production deployment or complete ASVS compliance.

## Execution Handoff

Proposed method: inline execution in this chat, task by task, without a new thread
or checkout. Review this plan before product-code changes. Each task uses a
red/green test cycle; integration waits for verification of earlier boundaries.
