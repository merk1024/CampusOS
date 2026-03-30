# CampusOS Roadmap

## Current status

CampusOS is already beyond a classroom scaffold. It now behaves like a real academic portal MVP with:

- role-based access for students, teachers, admins, and superadmins
- course assignment and enrollment flows
- schedule management for groups, subgroups, and individuals
- exams, grades, assignments, announcements, and attendance
- SQLite and PostgreSQL support
- Render deployment blueprints
- backend tests, security scripts, and import pipelines

## Near-term priorities

### 1. Stabilization

- [x] cover critical backend routes with tests
- [x] recheck role scenarios after recent UI changes
- [x] align root API responses and service text with the `CampusOS` brand
- [x] remove the most visible legacy CSS conflicts
- [x] separate staging configuration from production

### 2. Data readiness

- [x] add safe student, teacher, and course imports from CSV / TSV
- [x] add `course_enrollments + schedule` to the pilot import flow
- [x] prepare a read-only pipeline for university test exports
- [x] normalize the pilot seed dataset
- [x] document the external-data-to-schema mapping

### 3. Teacher workflow polish

- [x] improve attendance workspace for faster daily marking
- [x] add batch-oriented schedule editing
- [x] improve teacher-side assignments and exam flows
- [x] add audit trail storage for grade and attendance changes

## Product roadmap

### Phase 1 - Web MVP hardening

Goal: make the current web platform stable enough for a real pilot.

- [ ] finish UI polish on all primary pages
- [ ] fully unify forms, tables, and filters across all admin surfaces
- [x] improve empty states and system messages on core pages
- [x] make staging and production environment handling predictable
- [x] formalize the seed / cleanup / deploy flow

Current progress in this phase:

- shared empty-state and status-banner patterns are now used on key pages
- table presentation is more consistent on core admin screens
- env templates now exist for local, staging, and production
- an operations runbook now documents seed, cleanup, env validation, and Render deploy flow

### Phase 2 - Admin and academic operations

Goal: speed up daily work for administrators and teachers.

- [ ] bulk user creation
- [ ] bulk teacher-to-course assignment
- [ ] bulk student enrollment management
- [ ] operational academic reports
- [ ] import/export support for admin-side operations

### Phase 3 - Integration layer

Goal: let CampusOS act as a unified portal on top of existing university systems.

- [ ] read-only integration with subject-selection systems
- [ ] read-only integration with grade and attendance systems
- [ ] unified dashboard across multiple data sources
- [ ] reconciliation flow for conflicting data
- [ ] admin override flow for data conflicts

### Phase 4 - Analytics and communication

Goal: move beyond record keeping into insight and communication.

- [ ] performance dashboards for students and groups
- [ ] attendance analytics
- [ ] academic risk flags
- [ ] expanded announcement and notification flows
- [ ] faculty-ready report exports

### Phase 5 - Mobile direction

Goal: prepare a downloadable mobile experience after the web MVP stabilizes.

- [ ] stabilize the API contract for a mobile client
- [ ] decide between PWA, Capacitor, or a dedicated Android client
- [ ] ship a mobile pilot after the web MVP is stable

## Technical roadmap

### Backend

- [x] Node.js + Express API
- [x] JWT auth
- [x] SQLite support
- [x] PostgreSQL support
- [x] seed and cleanup scripts
- [x] environment validation script
- [ ] versioned schema migrations
- [ ] background jobs for imports and notifications

### Frontend

- [x] React + Vite SPA
- [x] role-based navigation
- [x] theme switcher
- [x] branded UI
- [x] optimized attendance workspace
- [x] shared empty-state and status-banner patterns on core pages
- [ ] stronger form consistency across every admin page
- [ ] broader accessibility pass

### Security

- [x] `helmet`
- [x] `cors`
- [x] rate limiting
- [x] `npm audit` flow
- [x] `eslint-plugin-security`
- [x] local secret scan
- [x] OWASP ZAP baseline
- [ ] remove remaining risky production defaults
- [ ] harden token storage strategy
- [ ] add a release security checklist

### DevOps

- [x] Render blueprint
- [x] PostgreSQL deployment path
- [x] health endpoint
- [x] staging blueprint
- [x] env validation flow
- [ ] CI pipeline
- [ ] deploy gating with automated checks
- [ ] error monitoring
- [ ] backup and restore playbook

## Product principles

### 1. Web first

Finish and stabilize the web platform before building the Android version.

### 2. Replace carefully

CampusOS does not have to replace every university system at once. A realistic path is to become the clean, unified layer on top of existing data sources first.

### 3. Operator-friendly UX

The product should reduce daily friction for teachers and admins:

- less scrolling
- fewer repeated clicks
- faster bulk actions
- clearer roles and permissions

## Success criteria for the next milestone

- [ ] pilot-ready web version without critical auth or data issues
- [ ] documentation fully aligned with the real codebase
- [ ] staging dataset close to a realistic university scenario
- [ ] a version that can be shown to teachers and administration with confidence
