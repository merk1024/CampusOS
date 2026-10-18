# Disposable PostgreSQL security verification

Start Docker Desktop with Linux containers, then run `npm run test:postgres`.
For an installed PostgreSQL 16 image, PowerShell supports:
`$env:POSTGRES_TEST_IMAGE='postgres:16-alpine'; npm run test:postgres`.
The default remains PostgreSQL 17; supported overrides are PostgreSQL 16/17
with optional Alpine tags.
The runner creates its own PostgreSQL 17 container with a random name/password
and a randomly assigned loopback port. It does not use the project's `.env`,
production DATABASE_URL, Compose stack, or persistent database volume as the
test target. The runner removes its container after tests finish.

The test checks schema migration preservation, authenticated APIs, course
ownership/reassignment, announcement and assignment isolation, academic profile
protection, grade/attendance rollback on audit failure, concurrent audit history,
and session revocation. Existing public-schema tables cause refusal before seed
or destructive migration checks.

CI runs the same integration suite against its own PostgreSQL service. A local
skip without TEST_DATABASE_URL is not evidence that PostgreSQL checks passed.
This command fails if Docker is unavailable. Image download may require network
access. An interrupted runner may leave its own randomly named container running;
inspect that exact container before stopping it.

## Local verification, 2026-10-18

The complete integration scenario passed on PostgreSQL 16 Alpine: one aggregate
test passed, zero failures, zero skips. It exercised all shared access and audit
remediation helpers. The disposable container was removed afterward.
PostgreSQL 17 was not verified locally because its image download did not
complete; CI remains configured for PostgreSQL 17.
