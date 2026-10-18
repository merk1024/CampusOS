# Security Center

Administrators and superadministrators can open Security Center from the sidebar.
Students and teachers cannot access its API or navigation item.

The sources are system events, grade history and attendance history. Filters
support actor name/email, an exact action and inclusive UTC calendar dates.
Results are newest first, with 50 records per page. Filter changes cancel stale
requests. The API bounds pagination and uses parameterized queries.

Rejected logins now record `login-failed`; inactive accounts record
`login-blocked`. Unknown accounts have no associated actor. Passwords and tokens
are not logged by these events. Raw technical audit details are not returned by
the Security Center API.

Existing audit records remain available. Changes made before auditing was
introduced cannot be reconstructed. This is a database-backed audit viewer,
not a cryptographically tamper-proof log or a complete SIEM.

## Suspicious activity warnings

Every audit request evaluates the last 10 minutes, independently of the history
filters and pagination. Five `login-failed` events or ten `access-denied` events
for one account trigger a warning. Unknown-account failures are grouped separately
and explicitly identified as combined anonymous activity, not one attacker.
Old and future-dated events are excluded. Each warning includes its count,
threshold, first/last event timestamps and an evidence request ID.

Warnings are computed from stored events and are not persisted incidents. Refresh
alerts to re-evaluate; there is no background notification, automatic blocking,
acknowledgement workflow or claim that a threshold proves an attack. Up to 100
warnings are returned, with a truncation indicator. Existing login rate limiting
continues to operate independently. An audit-storage failure can cause an event
to be missing, so this is not guaranteed complete detection.

MFA adds a distinct `failed-mfa` warning after five `mfa-failed` events in the same
10-minute window. It does not combine second-factor failures with password failures.

## Audit integrity

The Audit integrity panel performs an explicit administrator-only verification of
system, grade and attendance audit history. It distinguishes missing initialization,
unanchored history, a verified anchored prefix with an unanchored tail, violation
and verification unavailable. It never repairs data or initializes a baseline.
See AUDIT_INTEGRITY_OPERATIONS.md before operator setup or checkpoint retention.
