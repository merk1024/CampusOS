# CampusOS Access Policy

The decision module is `backend/security/accessPolicy.js`. Its interface is
`can(user, action, resource) -> boolean`. Unknown actions, missing identities,
and incomplete ownership context deny access. No database or HTTP dependency is
required to test a policy decision.

## Management matrix

| Action | Student | Teacher | Admin | Superadmin |
| --- | --- | --- | --- | --- |
| course.manage | Deny | Current course owner | Allow | Allow |
| exam.manage | Deny | Current course owner; legacy creator | Allow | Allow |
| attendance.manage | Deny | Current linked course owner | Allow | Allow |
| announcement.publish | Deny | Own course audience only | Allow | Allow |
| announcement.delete | Deny | Author and current owner if linked | Allow | Allow |
| admin.create | Deny | Deny | Deny | Allow |

## Enforcement

The caller authenticates the user and loads authoritative resource attributes.
For writes, load and lock the resource and linked course inside the existing
transaction, call the policy, then mutate and audit through the same executor.
Never use a submitted teacher ID or a display name as ownership evidence.

Exam operations and grade writes share `exam.manage`; attendance services share
`attendance.manage`; assignment creation and course services share
`course.manage`. Announcement publication/deletion and both administrator
provisioning paths use their respective actions.

This module centralizes management decisions. Student reads still use enrollment
and identity SQL filters; announcement audience matching remains a separate read
policy. SQL predicates, authentication, transaction locks, roster validation and
input validation are necessary enforcement layers, not replaced by `can()`.

## Verification

Run `node --test tests/access-policy.test.js` from `backend` for the role matrix.
Run `npm run verify:web` from the repository root for the integration scenarios,
including cross-teacher rejection, course reassignment and rollback tests.
The PostgreSQL integration test requires a disposable `TEST_DATABASE_URL`.
