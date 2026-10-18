# MFA implementation ledger

Scope: approved no-integration MFA plan. Existing dirty work is preserved.
No production keys, enforcement switches, commits or pushes have been changed.

- Crypto tests failed before module creation, then passed against RFC 6238 vectors.
- Storage test failed before schema creation, then passed with seed preservation.
- API test failed with missing MFA routes, then passed for two-step login and concurrent single-use recovery.
- Initial browser fixture referenced an account absent from seed. Ruling: provision a dedicated MFA test administrator through the real owner API, rather than change existing seed accounts.
- QR codes render locally; no provisioning secrets go to an external renderer.
- Ruling: aggregate failed MFA separately from password failures to keep alert meaning explicit.
- Opt-in setup and enforcement-only setup share scoped, transactionally revalidated enrollment.
- Startup validates the key when configured, enforced or when stored factors require it.
- Full SQLite and PostgreSQL suites passed during implementation; final review/regression checks remain below.
- Independent reviewer found recovery-code loss on background 401 and no enforced-enrollment restart path. Fixed with a transient expiry deferral plus modal acknowledgment/operation screen, and Back to sign in. Browser regression reproduced code loss before the fix and passed afterward.
- Ruling: MFA changes revoke server sessions immediately, while browser sign-out is deferred only until one-time codes are acknowledged. This preserves the security boundary and the recovery display.

## Final verification

- Backend suite: 71 tests, 70 passed, 1 PostgreSQL test skipped in the SQLite run, 0 failures.
- Disposable PostgreSQL 16: aggregate integration test passed, including TOTP/recovery concurrency, expiry, role/status changes, revocation and audit-failure rollback.
- Chromium: 8 scenarios passed, including mobile enrollment, one-time-code screen persistence on background 401, enrollment restart and unauthorized reset denial.
- Frontend lint and production build passed; git diff --check passed.
- Independent review findings were fixed and regression-tested. No production rollout, enforced enrollment, secret rotation or Git publication was performed.

Operational dependency: configure MFA_ENCRYPTION_KEY before enrolling real users.
Residual limitations: TOTP is not phishing resistant; key rotation and exceptional
owner recovery are operator procedures, not automated web endpoints. Browser
restart/reload intentionally does not persist provisioning or recovery codes.
