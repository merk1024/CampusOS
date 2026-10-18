# CampusOS diploma demonstration and staging acceptance

Scope: local academic data and security controls. PMS/OCS integrations are deferred.
Do not describe this build as a live integration, an ASVS certification, or a
completed production penetration test.

## Release acceptance

1. Record the pull request head SHA and require every CampusOS CI job to finish
   successfully for that SHA, including PostgreSQL, browser scenarios and ZAP.
2. Review database migration 009 and take a staging backup before deployment.
   Test restoration separately; a backup command alone does not prove recovery.
3. Confirm the staging URL, database identity and deployment credentials belong
   to staging. Never reuse production passwords, MFA keys or database URLs.
4. Deploy only the reviewed SHA and verify the actual deployed revision through
   the hosting provider. An accepted deploy hook is not revision verification.
5. Complete the MFA and audit steps below, recording outcomes without credentials.

Branch protection, hosting auto-deploy policy, remote CI success and live staging
settings must be checked externally. These are not configured by this document.

## Staging MFA rollout

Follow MFA_OPERATIONS.md. Configure a fresh staging-only MFA_ENCRYPTION_KEY through
the host secret settings, and retain its secure backup separately from the DB.
Never put its value in Git, chat, presentation slides or browser-side variables.

Keep MFA_REQUIRE_ADMIN_ENROLLMENT=false during initial enrollment. With a staging
administrator, enable MFA in Profile, confirm TOTP and securely retain the ten
recovery codes. Test login in a separate browser, consume one recovery code and
confirm it cannot be reused. Confirm old sessions no longer authorize API access.
Enroll all staging administrators before optionally enabling mandatory enrollment.

Stop if the key is missing, proof fails unexpectedly, recovery is untested or any
administrator risks lockout. Setting enforcement back to false does not bypass an
already enabled factor. Do not delete factors or replace the encryption key as a
routine rollback; use the reviewed recovery procedure with operator approval.

## Staging audit baseline and checkpoint

Follow AUDIT_INTEGRITY_OPERATIONS.md. First verify the staging database identity,
backup and migration version, then review the existing history before accepting
it as a baseline. From backend, with explicitly selected staging configuration:

```text
npm run audit:integrity -- init --confirm-baseline
npm run audit:integrity -- verify
npm run audit:integrity -- export ABSOLUTE_NEW_CHECKPOINT_FILE
```

The first verify should report unanchored. Independently retain the exported
checkpoint, provision a read-only reference and configure AUDIT_CHECKPOINT_PATH.
Then verify anchored-prefix-valid and inspect the unanchored tail count. The
checkpoint custodian must have a different write-access policy from DB writers;
placing a file next to the DB does not provide independent protection. Render's
ephemeral filesystem is not the sole retained copy. If no independent storage is
available, record unanchored as an explicit limitation instead of claiming success.

Stop on violation/unavailable, unexpected baseline state or restore failure.
Preserve evidence; never repair the result by re-baselining or replacing a trusted
checkpoint. Do not run the tampering demonstration on staging or production.

## Presentation script (8-10 minutes)

Use only disposable demo accounts/data and a clean browser profile. Hide password
manager suggestions, infrastructure credentials, TOTP QR/manual keys and recovery
codes from the projector. If enrollment is shown, use a separate throwaway account.

1. Student workspace (1 minute): show the web schedule, courses and grades. Explain
   that schedule imports are a staff workflow; students use the web page.
2. Access control (2 minutes): show that students cannot open User Management or
   alter protected profile fields. Reproduce through the existing automated suite,
   not by modifying real academic data. Show the administrator's Security Center
   access-denied events; refresh to show advisory alerts after the threshold.
3. MFA (2 minutes): sign in with a pre-enrolled demo administrator and TOTP. Explain
   that a password challenge is not a full session and recovery codes are single-use.
4. Audit history (1 minute): show previous/new grade or attendance values and actor
   attribution. Distinguish an application audit log from immutable storage.
5. Tamper evidence (2 minutes): run the isolated command below. Show intact history,
   edited-record detection, a recomputed chain failing the retained checkpoint and
   deleted-record detection. Explain the unanchored-tail limitation.
6. Evidence (1-2 minutes): show CI results for the reviewed SHA and
   SECURITY_REQUIREMENTS_MATRIX.md. Explain what was not tested or integrated.

Commands from the repository root:

```text
npm run verify:web
npm run test:e2e
npm --prefix backend run audit:demo
```

The tampering demo creates and removes its own temporary database/checkpoint.
Browser tests use loopback ports 5117/4173 and a disposable SQLite database.
Record actual command outcomes; do not call a skipped PostgreSQL aggregate passed.

## Evidence record

For the rehearsal, record: date, commit SHA, environment, each CI job outcome,
demo test totals, MFA login/replay outcome, audit baseline/checkpoint status and
limitations. Keep screenshots free of personal student information and secrets.
Do not fill in successful staging outcomes until they have actually been observed.
