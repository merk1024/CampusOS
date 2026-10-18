# Audit integrity design

Status: implemented and verified locally; production migration/baseline and
independently protected checkpoint retention have not been performed.

## Goal

Detect edits, deletion, insertion and reordering in system, grade and attendance
audit records. Provide an administrator-only verification result and a reproducible
tampering experiment on disposable data. This is tamper detection, not immutable
storage, complete attack detection or a guarantee against a compromised API host.
Existing MFA and other uncommitted work must be preserved. No integration,
production secret, database rewrite, deployment or Git publication is authorized.

## Threat boundary

A database writer may change original records and recompute every hash stored in
the database. A checkpoint retained outside that database is the independent
reference. It must be held under a different operational access policy; merely
putting it in another table is insufficient. An attacker controlling both the
API host/checkpoint store and database is outside this design's guarantee.

Do not describe a locally exported checkpoint as independent protection until an
operator places and protects it outside the database administrator's control.
On Render, ephemeral application filesystem storage is not durable evidence.

## Chain format and append

Use a global append-only sidecar chain, with an explicit version, chain ID,
monotonic sequence, source table, source record ID, canonical payload digest,
previous chain hash and current chain hash. Include domain separation and all
identity/link fields in SHA-256 input. Store a unique source/record association.
Canonicalization uses an explicit versioned field list, UTC timestamp encoding,
stable null/integer handling and lossless raw-text hashing for system details.
The original records remain the data being verified, not unchecked copies.

Append the audit record and chain entry in the same transaction. Serialize global
sequence assignment through a locked singleton chain-head row (or equivalent
conditional update), not MAX(sequence)+1 without a lock. Concurrent and rolled-back
writes must never yield forks or integrity entries for nonexistent records.

Integrate system logging in platformOps, academic logging in auditTrail, and seed
audit writers in seedOperations. Direct inserts without a chain entry are detected
by verification, not silently accepted. Changes already inside a transaction must
not open unsupported nested transactions.

## Historical retention and initialization

Current academic audit foreign keys cascade on exam/schedule deletion; some actor
references become null on user deletion. Those mutations would invalidate a chain.
Preserve historical audit identifiers and records when parent entities are removed,
using a reviewed, data-preserving migration for both database adapters. Live entity
joins are display-only, never hash inputs. Test legitimate parent deletion explicitly.
Do not silently stop otherwise-authorized parent deletion to preserve the log.

Use explicit operator initialization, with an exclusive transactional lock, to
baseline existing records in deterministic order and establish the first checkpoint.
Label that baseline as trusted only from initialization onward: it does not prove
that legacy records were never altered beforehand. No automatic re-baselining after
an integrity failure. Tests and demo seed must not reset a production chain.

## Independent checkpoint

An operator CLI exports a small checkpoint containing format version, chain ID,
sequence, head hash and creation time after successful verification. Export is
separate from business transactions and never overwrites the trusted checkpoint
as part of ordinary append or verify. A failed export cannot roll back an already
committed academic change; the UI reports checkpoint age/unanchored tail.

The operator retains the checkpoint in an independently protected location. The
API reads a configured absolute path to a read-only checkpoint supplied by that
operator. No user-controlled paths, checkpoint uploads or replacement API are
allowed. Export destination is explicitly selected, must be distinct from the
database file, and must not overwrite an existing checkpoint silently.

For development, use a separate disposable checkpoint file and clearly label its
limited trust boundary. A production external storage connector is deferred, not
simulated as installed. Missing, malformed, wrong-chain and future checkpoints
fail verification or produce a clear unanchored/not-configured state, never green.

An intact chain without a checkpoint cannot detect complete recomputation or
truncation of an internally consistent tail. A trusted checkpoint can validate its
anchored prefix; entries added afterward remain explicitly unanchored until the
operator retains a newer checkpoint. Rollback to an older trusted file cannot be
detected without an independently retained latest sequence; document this limit.

## Verification and interface

Verify from a consistent database snapshot, stream bounded pages, and check record
coverage, canonical digests, sequence/previous-hash links, head state and the trusted
checkpoint. Avoid a changing-head race while users continue writing. Verification
is explicit and administrator-only, not a full-table scan on every page request.
Never return raw audit details or secrets in failure diagnostics.

Security Center shows: not initialized, unanchored/not configured, valid anchored
prefix with checkpoint time and unanchored tail count, integrity violation, or
verification unavailable. Distinguish database/key/filesystem errors from a proven
integrity violation. Show verification time and a sanitized first failing record
reference. Verification has no repair button and never changes audit records.

## Acceptance and experiments

- An untouched initialized history validates against its retained checkpoint.
- Editing summary, grade/status, actor, timestamp or protected details is detected.
- Missing/extra records, reordered entries and middle/tail deletion are detected
  within the anchored range; distinguish the unanchored-tail limitation.
- Recomputing the database chain cannot validate against the retained head hash.
- Wrong-chain, malformed, missing and ahead-of-database checkpoints cannot appear valid.
- Parallel append and injected audit/chain failures preserve transaction atomicity.
- Legitimate entity deletion retains history and does not create false corruption.
- Students and teachers cannot invoke verification, initialization or export.
- Existing SQLite/PostgreSQL suites, browser scenarios, lint and build remain passing.
- The tampering demonstration refuses non-disposable/production databases and
  reports original validation, modified validation and checkpoint comparison.

## Delivery boundaries

Implement in this chat after written design and implementation-plan approval.
Keep external production storage, continuous scheduled verification, automatic
repair, checkpoint rotation and production migration execution out of this task.
