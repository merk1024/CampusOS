# CampusOS Roadmap

## Status legend

- `√` done and closed
- `-` in progress
- `x` not started

---

## Current state

CampusOS is already operating as a real web MVP for academic workflows.

### Implemented

- authentication by email and student ID
- roles: `student`, `teacher`, `admin`, `superadmin`
- profile and user management
- course management, teacher assignment, and enrollment
- exams, grades, attendance, assignments, and announcements
- group, subgroup, and individual schedule management
- import and reconciliation flows for pilot datasets
- light and dark theme
- SQLite and PostgreSQL support
- CI, health checks, monitoring hooks, audit trails, and deploy documentation

---

## Product roadmap

### Phase 1 - Web MVP hardening

Goal: bring the current web platform to a stable pilot-ready state.

- `-` finish UI polish on the main pages
- `√` unify forms, tables, and filters
- `√` improve empty states and system messages
- `√` make staging and production environment handling predictable
- `√` formalize the seed / cleanup / deploy flow

### Phase 2 - Admin and academic operations

Goal: strengthen daily workflows for administration and teachers.

- `√` bulk user creation
- `√` bulk teacher assignment to courses
- `√` bulk student enrollment into subjects
- `√` generation of academic lists and operational reports
- `√` import / export for administrative workflows

### Phase 3 - Integration layer

Current progress:

- `√` initial read-only reconciliation reports for CSV / TSV university exports

Goal: turn CampusOS into a convenient unified portal on top of existing university systems.

- `-` read-only integration with subject selection systems
- `-` read-only integration with grades and attendance systems
- `-` unified dashboard on top of multiple sources
- `-` reconciliation layer for conflicting data
- `-` manual override scenarios for administration

### Phase 4 - Analytics and communication

Goal: make the product not only operational, but analytical.

- `x` performance dashboards for students and groups
- `x` attendance analytics
- `x` risk flags for academic problems
- `x` expanded announcements / notification flows
- `x` faculty and dean office report exports

### Phase 5 - Mobile direction

Goal: move to a downloadable mobile app after the web version is stabilized.

- `-` prepare a stable web API contract for a mobile client
- `-` choose between PWA / Capacitor / separate Android client
- `x` build a mobile pilot after the web MVP stabilizes

---

## Technical roadmap

### Backend

- `√` Node.js + Express API
- `√` JWT auth
- `√` SQLite support
- `√` PostgreSQL support
- `√` seed and cleanup scripts
- `√` full schema version migrations
- `√` broader audit logging
- `√` background jobs / queue for imports and notifications

### Frontend

- `√` React + Vite SPA
- `√` role-based navigation
- `√` theme switcher
- `√` branded UI
- `√` optimized attendance workspace
- `√` stronger form consistency across all admin pages
- `√` better table mode for data-heavy pages
- `√` broader accessibility pass

### Security

- `√` `helmet`
- `√` `cors`
- `√` rate limiting
- `√` `npm audit` flow
- `√` `eslint-plugin-security`
- `√` local secret scan
- `√` OWASP ZAP baseline
- `√` remove remaining risky defaults from production configuration
- `√` harden token storage strategy
- `√` add a release security checklist

### DevOps

- `√` Render blueprint
- `√` PostgreSQL deployment path
- `√` health endpoint
- `√` CI pipeline
- `√` automated tests in deploy gate
- `√` error monitoring
- `√` backup and restore playbook

---

## Product principles

### 1. Web first

Finish and stabilize the web platform first. Android follows after the web MVP stops changing rapidly.

### 2. Replace carefully

CampusOS does not need to replace existing university systems immediately. The more realistic path is to become a clean unified interface above current systems first.

### 3. Operator-friendly UX

Priority is not only visual polish, but everyday operational speed:

- less unnecessary scrolling
- fewer repeated actions
- faster bulk operations
- clearer role and access boundaries

---

## Success criteria for the next milestone

- `-` pilot-ready web version without critical auth or data issues
- `√` up-to-date documentation without mismatches against the code
- `-` staging dataset close to realistic university data
- `-` readiness to demo the system to teachers and administration
