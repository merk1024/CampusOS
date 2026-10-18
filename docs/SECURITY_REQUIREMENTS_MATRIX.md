# CampusOS security evidence matrix

Reference: [OWASP ASVS 5.0.0](https://github.com/OWASP/ASVS/tree/v5.0.0/5.0/en).
The categories below use that version's chapter names. COS-* identifiers are
local controls, not ASVS requirement numbers. Mapping an implemented control to
a chapter does not establish compliance with all of that chapter or an ASVS level.
Results refer to disposable/local tests, not production assurance.

| Control | Requirement and ASVS area | Implementation | Evidence | Result / limit |
| --- | --- | --- | --- | --- |
| COS-01 | Deny administrative access to students/teachers; V8 Authorization | Backend authorization and access policy | access-policy.test.js, api.test.js, security.spec.mjs | Local scenarios passed; no complete endpoint inventory certification |
| COS-02 | Deny cross-teacher academic writes; V8 Authorization | Course-owner checks inside transactions | helpers/academicAccess.js, helpers/contentSecurity.js | SQLite/PostgreSQL scenarios passed |
| COS-03 | Deny self-promotion through profile input; V2 Validation and Business Logic / V8 Authorization | Protected profile-field allowlist | api.test.js; browser student role/is_superadmin scenario | Direct API attempts blocked; user identity remains student |
| COS-04 | Require second factor for enrolled administrators; V6 Authentication | Scoped challenges, TOTP, recovery codes | mfa-api.test.js, mfa.spec.mjs | Local enrollment/recovery passed; production key and rollout still required |
| COS-05 | Reject replay and concurrent recovery reuse; V6 Authentication | Persisted budgets and atomic consumption | mfa-api.test.js, helpers/mfaSecurity.js | At most one concurrent verification succeeds |
| COS-06 | Revoke stale sessions; V7 Session Management / V9 Self-contained Tokens | session_version and MFA claims rechecked server-side | api.test.js, helpers/auditRemediation.js, security.spec.mjs | Password/logout/status scenarios passed |
| COS-07 | Protect TOTP secrets; V11 Cryptography / V14 Data Protection | Account-bound AES-GCM encryption and server-only key | mfa-crypto.test.js, mfa-storage.test.js | Tamper/wrong-key cases rejected; operational key backup is external responsibility |
| COS-08 | Record changes without exposing credentials; V16 Security Logging and Error Handling | Sanitized system/academic audit projections | api.test.js, mfa-api.test.js | Checked projections/events exclude supplied test secrets; not a universal log-redaction proof |
| COS-09 | Detect protected-history edits; V16 Security Logging and Error Handling | Transactional hash chain and retained independent checkpoint | audit-integrity.test.js, helpers/auditIntegrity.js, audit:demo | Tampering/rollback/concurrency checks passed; independent checkpoint setup required |
| COS-10 | Never treat missing security tooling as success; V13 Configuration | Fail-closed ZAP runner, manifest and report checks | zap-runner.test.js; scan:zap run.json | Guard tests passed; actual scanner outcome must be read from that run |
| COS-11 | Check anonymous HTTP responses; V4 API and Web Service / V3 Web Frontend Security | Ten fixed ZAP requests and passive rules | output/security/zap/561566d6aa9a | Local scan passed with 0 alerts; no authenticated scan or frontend crawler |
| COS-12 | Run regression checks on changes; V15 Secure Coding and Architecture | GitHub Actions test, audit and scan jobs | .github/workflows/ci.yml | Configured locally; remote execution/required checks/deploy gates not yet confirmed |

## Deferred / not established

Full ASVS requirement-by-requirement assessment, production TLS and proxy policy,
secure deployment verification, file-upload scanning, OAuth/OIDC, PMS/OCS
integration security, authenticated/active ZAP plans, third-party penetration
testing and complete incident-response metrics. No certification is claimed.
