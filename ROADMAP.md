# CampusOS Roadmap

## Status legend

- `√` done and closed
- `-` in progress
- `x` not started

---

## Current state

CampusOS has moved beyond a training skeleton and already works as a real MVP for an academic portal.

### Implemented

- authentication by email and student ID
- roles: `student`, `teacher`, `admin`, `superadmin`
- user and profile management
- course management and teacher assignment
- student enrollment into courses
- exams and grade entry
- announcements / messages
- assignments and academic records
- schedules for groups, subgroups, and individual students
- drag-to-copy in schedule management
- attendance workspace for teachers and attendance history for students
- light and dark theme
- Render deployment blueprint
- SQLite / PostgreSQL dual database support
- security scripts: audit, secret scan, ZAP baseline

---

## Near-term priorities

### 1. Stabilization

- `√` cover critical backend routes with tests
- `√` check role scenarios after recent UI changes
- `√` align root API responses and service texts with the `CampusOS` brand
- `√` remove remaining point CSS conflicts from old pages
- `√` prepare staging configuration separately from production

### 2. Data readiness

- `√` add safe import for students, teachers, and courses from CSV / TSV
- `√` prepare a read-only pipeline for university test exports
- `√` normalize seeds into a more realistic pilot dataset
- `√` document the mapping between external data and the current database schema
- `√` add import support for `course_enrollments + schedule`

### 3. Teacher workflow polish

- `√` add faster tabular attendance workflow
- `√` add batch editing for schedule
- `√` improve teacher assignment and exam flows
- `√` add audit trail for grade and attendance changes

---

## Product roadmap

### Phase 1 — Web MVP hardening

Goal: bring the current web platform to a stable pilot-ready state.

- `-` finish UI polish on the main pages
- `√` unify forms, tables, and filters
- `√` improve empty states and system messages
- `√` make staging and production environment handling predictable
- `√` formalize the seed / cleanup / deploy flow

### Phase 2 — Admin and academic operations

Goal: strengthen daily workflows for administration and teachers.

- `√` bulk user creation
- `√` bulk teacher assignment to courses
- `√` bulk student enrollment into subjects
- `√` generation of academic lists and operational reports
- `√` import / export for administrative workflows

### Phase 3 — Integration layer

Current progress:

- `√` initial read-only reconciliation reports for CSV / TSV university exports

Goal: turn CampusOS into a convenient unified portal on top of existing university systems.

- `-` read-only integration with subject selection systems
- `-` read-only integration with grades and attendance systems
- `-` unified dashboard on top of multiple sources
- `-` reconciliation layer for conflicting data
- `-` manual override scenarios for administration

### Phase 4 — Analytics and communication

Goal: make the product not only operational, but analytical.

- `x` performance dashboards for students and groups
- `x` attendance analytics
- `x` risk flags for academic problems
- `x` expanded announcements / notification flows
- `x` faculty and dean office report exports

### Phase 5 — Mobile direction

Goal: move to a downloadable mobile app after the web version is stabilized.

- `x` prepare a stable web API contract for a mobile client
- `x` choose between PWA / Capacitor / separate Android client
- `x` build a mobile pilot after the web MVP stabilizes

---

## Technical roadmap

### Backend

- `√` Node.js + Express API
- `√` JWT auth
- `√` SQLite support
- `√` PostgreSQL support
- `√` seed and cleanup scripts
- `x` full schema version migrations
- `-` broader audit logging
- `x` background jobs / queue for imports and notifications

### Frontend

- `√` React + Vite SPA
- `√` role-based navigation
- `√` theme switcher
- `√` branded UI
- `√` optimized attendance workspace
- `-` stronger form consistency across all admin pages
- `-` better table mode for data-heavy pages
- `x` broader accessibility pass

### Security

- `√` `helmet`
- `√` `cors`
- `√` rate limiting
- `√` `npm audit` flow
- `√` `eslint-plugin-security`
- `√` local secret scan
- `√` OWASP ZAP baseline
- `-` remove remaining risky defaults from production configuration
- `x` harden token storage strategy
- `x` add a release security checklist

### DevOps

- `√` Render blueprint
- `√` PostgreSQL deployment path
- `√` health endpoint
- `x` CI pipeline
- `x` automated tests in deploy gate
- `x` error monitoring
- `x` backup and restore playbook

---

## Product principles

### 1. Web first

Finish and stabilize the web platform first.  
Android follows after the web MVP stops changing rapidly.

### 2. Replace carefully

CampusOS does not need to replace existing university systems immediately.  
The more realistic path is to become a clean unified interface above the current systems first.

### 3. Operator-friendly UX

Priority is not only visual polish, but everyday operational speed:

- less unnecessary scrolling
- fewer repeated actions
- faster bulk operations
- clearer role and access boundaries

---

## Success criteria for the next milestone

- `-` pilot-ready web version without critical auth or data issues
- `-` up-to-date documentation without mismatches against the code
- `-` staging dataset close to realistic university data
- `-` readiness to demo the system to teachers and administration
