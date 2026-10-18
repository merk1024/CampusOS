# Audit Integrity Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Use failing tests before product changes and preserve the existing dirty checkout.

**Goal:** Detect changes to all three audit histories, with independently retained checkpoints and an administrator-only verification interface.

**Architecture:** Keep original audit records and immutable identifiers, append a transactionally serialized sidecar hash chain, and verify against a consistent snapshot. Initialize legacy history explicitly. Retain operator-selected checkpoints outside the database; verification never repairs data or replaces its reference.

**Tech Stack:** Node crypto/fs, Express, React, SQLite and PostgreSQL. No external integration or new cryptographic dependency.

**Spec:** `docs/AUDIT_INTEGRITY_DESIGN.md`.

**Execution:** Implemented locally. Actual verification and review results are
recorded in `docs/AUDIT_INTEGRITY_RESULTS.md`; production operations remain excluded.

## Global Constraints

- No production migration execution, integration, deployment, commit, push or secret changes.
- Preserve existing MFA/security changes; work in this chat and checkout.
- Protect system_audit_log, grade_audit_log and attendance_audit_log.
- Atomic audit/chain append, fixed format version, SHA-256 domain separation and unique source/record association.
- Verification without a trusted checkpoint cannot claim independent protection against database-chain recomputation.
- Parent deletion preserves historical records/identifiers without disabling otherwise-authorized deletion.
- No automatic baseline, repair, checkpoint replacement, user-supplied paths or checkpoint-upload endpoint.
- Original details and credentials are never returned in verification diagnostics.

## Review Focus

- PostgreSQL writes during verification must not produce a mixed snapshot or a false violation.
- Deleting actors/exams/schedules must not rewrite hashed identifiers or erase evidence.
- An intact unanchored chain must not be presented as externally verified.
- Failed chain insert or baseline must roll back audit/metadata changes together.
- Wrong-chain, truncated, malformed or replaced checkpoints must not appear valid.

### Task 1: Retention migration and digest format

**Files:** Create `backend/security/auditIntegritySchema.js`, `backend/security/auditDigest.js`, `backend/tests/audit-digest.test.js`, `backend/tests/audit-retention.test.js`; modify `backend/config/database.js`.

**Interfaces:** `canonicalAuditRecord(source,row)` returns versioned canonical text from an explicit source field list. `auditDigest(source,row)` and `chainDigest({chainId,sequence,source,recordId,payloadHash,previousHash})` return SHA-256 hex digests. Normalize SQL timestamps to UTC and calendar dates to YYYY-MM-DD; null and integer representation must match across adapters.

- [ ] Write failing tests for deterministic canonicalization, every protected field, raw JSON text changes, timestamps/nulls and both database representations.
- [ ] Add migration `2026-10-18-009-audit-integrity`: rebuild SQLite audit tables transactionally with original IDs/data and recreate indexes; remove only mutating audit-reference constraints in PostgreSQL. Do not drop user/business tables.
- [ ] Add singleton head and chain-entry tables: chain ID/version, initialized flag, sequence/hash, unique source/record pair, and initialization metadata. Use non-cascading original record references, not relational deletion triggers.
- [ ] Run digest/retention tests, including old-schema migration, repeated migration and deletion of referenced entities. Confirm all records and immutable identifiers survive.

### Task 2: Transactional append and explicit baseline

**Files:** Create `backend/services/auditIntegrityService.js`, `backend/tests/audit-integrity.test.js`; modify `backend/utils/platformOps.js`, `backend/utils/auditTrail.js`, `backend/seeds/seedOperations.js` and transaction helpers in `backend/config/database.js`.

**Interfaces:** `appendAuditRecord(source,sql,params,executor)` returns the existing run-result shape; `initializeAuditChain()` returns chainId/sequence/hash/baseline time. Expose a transaction-aware adapter helper that reuses active transactions rather than nesting them. Only fixed source names are accepted.

- [ ] Write failing tests for concurrent append, duplicate association, rollback and no chain initialization by ordinary writes.
- [ ] Append audit row and chain entry in one transaction; lock the singleton head before source insertion/sequence allocation and update it conditionally. A not-initialized chain remains explicitly uninitialized.
- [ ] Route all known business/seed audit writers through the wrapper, keeping no-op grade/attendance behavior and injected-failure test compatibility.
- [ ] Baseline legacy records in deterministic source/ID order under an exclusive head lock; refuse repeat initialization. Label legacy trust as beginning at baseline creation, never retrospectively proven.
- [ ] Verify concurrent baseline/write behavior and injected chain failures in SQLite and PostgreSQL; preserve original business/audit rollback semantics.

### Task 3: Snapshot verification and independent checkpoint CLI

**Files:** Create `backend/security/auditCheckpoint.js`, `backend/scripts/audit-integrity.js`, `backend/tests/audit-checkpoint.test.js`; extend service/adapter tests and `backend/package.json`.

**Interfaces:** `verifyAuditChain({checkpoint})` returns sanitized status, verifiedAt, chainId, anchoredSequence, tailCount, checkpointTime and optional first failing source/ID/sequence. `readTrustedCheckpoint(path)` validates a bounded, versioned file. CLI commands: `init`, `verify`, `export`; an explicit destination argument is required for export.

- [ ] Write failing tests for changed/extra/missing/reordered records, prefix/tail removal, recomputation, wrong chain, future checkpoint, malformed file and absent checkpoint.
- [ ] Read originals, sidecar and head from a consistent snapshot. Add an explicit repeatable-read transaction option for PostgreSQL verification; SQLite uses its serialized transaction boundary. Stream fixed-size pages rather than loading the entire audit history.
- [ ] Check complete source-record coverage and linkage. Return not-initialized, unanchored, anchored-prefix-valid, violation or unavailable; never collapse these into a boolean green badge.
- [ ] Export only after a successful internal verification, using exclusive file creation. Refuse destination equal to SQLite DB, existing files and implicit/default overwrite. File I/O happens outside business transactions.
- [ ] API reads only operator-configured AUDIT_CHECKPOINT_PATH. Missing configuration produces unanchored status, not independent verification. Do not write checkpoints automatically during append/verify.
- [ ] Test snapshot verification while writers commit. Document last-checkpoint/unanchored-tail and trusted-file rollback limits.

### Task 4: Security Center verification interface

**Files:** Create `frontend/src/components/AuditIntegrityPanel.jsx` and `frontend/e2e/audit-integrity.spec.mjs`; modify `backend/routes/ops.js`, `frontend/src/api.js`, `frontend/src/components/SecurityCenter.jsx` and existing browser/test fixtures.

**Interfaces:** `POST /api/ops/audit-integrity/verify` requires auth/isAdmin and existing Origin protection, accepts no checkpoint/path and uses no-store responses. `api.verifyAuditIntegrity(signal)` maps this endpoint.

- [ ] Write failing backend access tests and a browser scenario showing uninitialized/unanchored states without exposing an initialization button.
- [ ] Implement explicit verification with rate limiting and cancellation/stale-result handling. Do not run a full verification on every audit request or background poll.
- [ ] Render localized status, verification/checkpoint time, anchored prefix, tail count and sanitized violation reference. Unavailable is visibly different from corruption.
- [ ] Verify student/teacher denial through direct requests, mobile layout and repeated-click behavior; keep raw audit details out of the response.

### Task 5: Disposable demonstration and final review

**Files:** Create `backend/scripts/demo-audit-tampering.js`, `docs/AUDIT_INTEGRITY_OPERATIONS.md`, `docs/AUDIT_INTEGRITY_RESULTS.md`; extend PostgreSQL helper tests and example environments/.gitignore as needed.

- [ ] Build a demonstration that creates its own temporary SQLite database and checkpoint, refuses caller-supplied production DBs, and always closes/cleans up its own resources.
- [ ] Demonstrate intact history, changed record, deleted record and recomputed database chain versus the independently retained checkpoint. Do not modify real user data to produce a screenshot.
- [ ] Document operator baseline/export/reference retention, backups, checkpoint access policy and Render ephemeral-filesystem limitations. Production external checkpoint storage remains an operator responsibility.
- [ ] Run full backend suite, disposable PostgreSQL integration, frontend lint/build, browser tests and git diff --check; record actual counts and any remaining gaps.
- [ ] Obtain one focused independent code review, fix actionable findings with regression tests and report only verified outcomes. No claim of immutable logging or ASVS certification.

## Execution Handoff

Proposed execution: inline in this chat, all five tasks in sequence without
additional check-ins between tasks. Written-plan approval is the final planning
gate; after approval, proceed through code, review and verification without
repeatedly asking whether to continue. Production operations remain excluded.
