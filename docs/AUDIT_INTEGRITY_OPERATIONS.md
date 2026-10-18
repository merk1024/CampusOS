# Audit integrity operations

## What is protected

The system, grade and attendance audit tables are linked to one SHA-256 sidecar
chain. Audit append and chain append commit together. Audit IDs and parent/actor
identifiers survive parent deletion; display joins are not hash inputs.
PostgreSQL verification uses repeatable-read snapshots; SQLite uses an isolated
transaction. PostgreSQL timestamp microseconds are preserved in the digest input.

The migration creates the schema but does not initialize or trust existing history.
Baseline initialization is explicit and cannot be repeated. Legacy history is
trusted only as observed at baseline time; past integrity is not retrospectively
proven. Ordinary seed writes do not reset the chain, and initialized seed audit
records are not rewritten. Never run demonstration/seed repair against production.

## Operator procedure

Back up the database and review historical records before initializing. Commands
below run in backend with the intended database configuration; they modify that
database only when initializing, not when verifying or exporting.
Deploy/apply the reviewed migration separately first (for a local database,
`npm run db:init`). Audit commands refuse a schema missing their migration and
never apply migrations implicitly, including initialization.

```
npm run audit:integrity -- init --confirm-baseline
npm run audit:integrity -- verify
npm run audit:integrity -- export ABSOLUTE_NEW_CHECKPOINT_FILE
```

Replace ABSOLUTE_NEW_CHECKPOINT_FILE with a new absolute destination. Export uses
exclusive creation and never overwrites an existing file. It cannot use the SQLite
database path. Retain the exported checkpoint under a different access policy from
database writers, then configure server-only AUDIT_CHECKPOINT_PATH to its absolute
read-only path. Do not supply a file through a browser or API request.

The exported file contains only version, chain ID, sequence, head hash and creation
time, not raw academic records or credentials. With a configured checkpoint,
exports must validate its anchored prefix first. Promote a newer checkpoint only
through an independently approved operator process; keep the latest trusted
sequence/reference outside the database. The application never rotates it itself.

On Render, ephemeral deploy files are not durable independent evidence. Use
independently retained copies and an operator-provisioned readable reference.
No cloud/object-storage integration is installed by this feature. Until that
operational setup exists, the UI correctly reports unanchored status.

## Results and limits

- not-initialized: no baseline exists; no historical protection is claimed.
- unanchored: internal chain checks passed, but no independent reference exists.
- anchored-prefix-valid: the retained prefix matches. Newer entries are explicitly
  unanchored until another checkpoint is independently retained.
- violation: a record/link/coverage/head/checkpoint comparison failed. Preserve
  evidence and investigate; do not re-baseline or overwrite the checkpoint.
- unavailable: database/snapshot/file validation failed; this is not proof of a
  malicious change and is never a green verification result.

Verification is explicit, administrator-only, rate limited and no-store. The API
does not expose raw details, checkpoints or repair/initialization endpoints.
Large histories can take time: memory is paged, but verification queries each
record and holds a database snapshot. Set operational timeouts and schedule checks
appropriate to deployment load; background scheduling is not implemented here.

An attacker able to modify all database hashes may produce a self-consistent
unanchored chain. A checkpoint outside their control detects changes in its
anchored range. Rewriting an unanchored tail or replacing the trusted file with an
older trusted copy cannot be prevented/detected by this mechanism alone. An
attacker controlling both API/checkpoint storage and database is outside the
guarantee. This is tamper evidence, not immutable/WORM storage or certification.

## Diploma demonstration

```
npm run audit:demo
```

This command accepts no database arguments, overrides DB_CLIENT and database path
before loading configuration, creates a disposable database/checkpoint, and cleans
up only its verified temporary directory. It shows intact history, edited/deleted
records and a fully recomputed database chain failing the retained checkpoint.
It never uses production data to manufacture a demonstration.
