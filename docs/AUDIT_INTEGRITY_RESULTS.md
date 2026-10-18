# Audit integrity results

Verified locally on 2026-10-18. No production database, checkpoint baseline,
publication or deployment was changed. Existing MFA/security work was preserved.

## Checks

- Backend: 78 tests, 77 passed, 1 PostgreSQL aggregate skipped in the SQLite run,
  0 failures. The PostgreSQL aggregate was run separately and passed on disposable
  PostgreSQL 16.
- Chromium: 9 scenarios passed, including administrator-only integrity UI and
  existing MFA/access-control regression scenarios.
- Frontend lint and production build passed. git diff --check passed.
- Disposable tampering demonstration passed: intact prefix valid; changed record
  detected; recomputed database chain rejected against retained checkpoint; deleted
  record detected. Temporary demo resources were removed.

## Coverage and review

Tests cover system/grade/attendance field changes, extra/untracked records, record
deletion, wrong/future-sequence checkpoints, concurrent append, repeatable-read
verification during append, rollback on chain insertion failure and retention of
historical IDs after actor/exam/schedule deletion. Files are bounded/validated;
checkpoint export refuses overwrite and relative paths. The CLI refuses pending
migrations rather than mutating the schema implicitly.

Independent read-only review identified three P2 issues: seed/baseline race,
discarded supplied executor and implicit CLI migrations. Each was corrected and
regression-tested. Seed updates now hold the head lock in the same transaction;
unsupported executors are rejected; CLI commands require an explicitly migrated
existing database. Additional tests preserve SQLite's high-water allocation counter
when rebuilding audit tables, even if the highest row was previously deleted.

Ruling: hash system details as lossless raw text rather than parsed JSON. JavaScript
JSON parsing could round large numbers and conceal meaningful edits. JSON whitespace
and key-order changes intentionally change the digest. Timestamp representation is
normalized across adapters while PostgreSQL microseconds are preserved explicitly.

## Operational limits

Independent protection requires a checkpoint genuinely retained outside the
database writer's control. No production external-storage integration is installed.
The UI reports not-initialized/unanchored until an operator performs setup.
The unanchored tail is not externally certified; replacing a trusted file with an
older trusted reference needs independently retained latest-reference tracking.
Host-plus-checkpoint compromise is outside the guarantee. Verification is explicit,
paged but query-intensive, with deployment load/timeout tuning still required.

Legacy initialization observes current history, not proof of its earlier integrity.
This feature provides tamper evidence, not immutable storage or security certification.
