# Local security verification results

Verified on 2026-10-18. Changes are local; GitHub Actions execution, repository
required checks, Render deploy gates and production configuration are not confirmed.

| Check | Actual result |
| --- | --- |
| Backend suite | 83 tests: 82 passed, 1 PostgreSQL aggregate skipped in this SQLite run, 0 failures |
| Chromium scenarios | 11 passed, including self-promotion denial and anonymous privileged-endpoint denial |
| Frontend lint / build | Passed |
| ZAP Automation Framework | Passed on ten fixed anonymous API requests; expected response codes matched |
| ZAP alert types | High 0, Medium 0, Low 0, Informational 0 in this limited run |
| Runner safeguards | URL overrides, malformed/wrong-target reports and Medium/High alerts rejected by tests |
| git diff --check | Passed |

Pre-release follow-up: E2E API startup now explicitly binds to 127.0.0.1 and
asserts the actual listener address. Two backend regression tests cover loopback
binding and preservation of the default wildcard binding for containers/production.
The full backend suite and all 11 Chromium scenarios passed after this fix.
Generated ZAP reports are excluded from Git; the ZAP result below is historical,
not a new scan of this follow-up change.

ZAP artifacts: `output/security/zap/561566d6aa9a/` contains plan.yaml, run.json,
zap-traditional-json.json and zap-traditional-html.html. run.json records actual
ZAP and target image IDs, times and alert-type counts. Reports are generated
artifacts, not committed evidence; retain CI artifacts or an approved external copy
when preparing the diploma.

Initial infrastructure attempts failed before scanning: Debian's glibc was too
old for the downloaded SQLite binary, then the image lacked the server's internal
pilot-import library. SQLite is now compiled against the target image and smoke
loaded during build, and the library is included. These failures returned nonzero
and retained failed manifests; no failure was relabeled as a successful skip.
The final test containers/network were removed; no production target was scanned.

Limits: anonymous API passive rules only, no active attacks, authenticated ZAP or
frontend crawling. Zero alerts for these requests does not imply that CampusOS is
vulnerability-free or ASVS-certified. Production TLS, proxy/cookie policies and
publication controls still require deployment-specific verification.
