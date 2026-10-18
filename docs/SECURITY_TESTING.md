# Security verification workflow

## Commands and boundaries

From the repository root:

```
npm run test:backend
npm run test:e2e
npm run test:postgres
npm run scan:zap
```

ZAP is a fixed anonymous API passive scan implemented with the
[official Automation Framework](https://www.zaproxy.org/docs/automate/automation-framework/).
Its generated JSON document is valid YAML and contains ten explicit requestor
requests, response-code expectations, passive-scan waiting, HTML/JSON reporting
and exit-status gates. Medium and High alerts, unexpected status warnings,
infrastructure failures and missing reports fail the command. Low/Informational
findings remain visible in reports and still require review.

This is not an active penetration test, authenticated ZAP scan, frontend crawler,
SQL-injection proof or full ASVS assessment. Authenticated role/MFA/business-flow
checks belong to the backend and Playwright suites. TLS, production cookie policy,
reverse proxies, distributed rate limiting and deployment configuration are not
validated by this isolated HTTP scan.

## Isolation

The runner accepts no URL or command-line arguments and rejects ZAP_TARGET_URL.
It builds a dedicated demo API image, seeds a temporary SQLite database and uses
random disposable credentials. A randomly named Docker internal network connects
only that target and ZAP. No host ports, production volumes, database URLs or
Docker socket mounts are exposed to either container. No active scanner, spider,
script or replacer job is included. The build context excludes .env files,
databases, uploads, node_modules and key files.

Docker and registry access are required. An unavailable engine or failed image
pull is a failed/unexecuted scan, never a successful skip. Readiness must pass
before ZAP starts. The runner removes only containers/network/image created for
that run; reports remain under output/security/zap/RUN_ID. run.json records status,
times, scope and actual image IDs when available. Registry stable tags are mutable;
the recorded IDs provide run provenance, not a promise of future identical scans.

The old PowerShell baseline script now delegates to this safe runner and refuses
arbitrary target/report-path overrides. It no longer silently passes without Docker.

## CI and publication

GitHub Actions retains existing backend, browser, frontend quality and PostgreSQL
jobs. The ZAP job runs only after prerequisite checks pass, has a bounded timeout,
and retains reports/manifests even on failure for 14 days. Missing artifacts fail
the artifact step. Only test data and anonymous responses are requested.

Workflow changes are local until committed/pushed; a local pass is not evidence
that GitHub Actions has run. Repository administrators must configure required
checks/rulesets and configure deployment to wait for CI. In particular, Render
auto-deploy can operate independently of GitHub status checks. This task does not
change repository protection or Render settings and does not claim publication
is already blocked by those external policies.

Use SECURITY_REQUIREMENTS_MATRIX.md as a bounded diploma evidence table, not a
claim that every requirement or ASVS level has been met.
