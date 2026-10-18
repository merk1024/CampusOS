# Browser security checks

Install both packages with `npm ci` in `backend` and `frontend`, then run
`npx playwright install chromium` from `frontend`. Run `npm run test:e2e` from
the repository root.

The suite starts isolated API/frontend processes on loopback ports 5117/4173.
Existing services on these ports cause startup failure rather than reuse.
Its SQLite database is newly created in the OS temporary directory and is
removed on graceful shutdown. Test account passwords are disposable fixtures.
Never substitute production credentials or a production database.

Covered scenarios: real role-based login and navigation, student/teacher denial
of the user directory, student academic-field tampering rejection, password
change followed by logout and fresh login. These complement backend ownership,
reassignment and transaction tests; they do not constitute a penetration test.

Failure screenshots and traces are written to ignored `output/playwright/`.
Use `npm run test:e2e -- --headed` from frontend for interactive inspection.
