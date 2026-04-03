# CampusOS Mobile API Contract

CampusOS now follows a `PWA-first, Capacitor-ready` mobile direction.

This document captures the stable API surface that a mobile client can rely on without duplicating web-only behavior.

## 1. Transport and auth

- Base path: `/api`
- Response format: JSON
- Auth strategy: secure `HttpOnly` cookie session
- Session expiry behavior: `401` with a session-related error message
- Client expectation: when a session expires, return the user to the sign-in flow and clear local profile state

Mobile clients should not store JWT tokens directly. CampusOS already uses cookie-based auth for the web shell, and the mobile pilot should preserve the same contract whenever possible.

## 2. Stable mobile feature groups

These groups are ready to support a mobile pilot without inventing new backend endpoints.

### Authentication and identity

- `POST /auth/login`
- `POST /auth/logout`
- `GET /users/profile/me`
- `PUT /users/profile/me`

### Dashboard and academic health

- `GET /ops/performance-dashboard`
- `GET /ops/risk-flags`
- `GET /attendance/analytics`

### Courses and enrollment

- `GET /courses`
- `GET /courses/enrolled`
- `POST /courses/:id/enroll`
- `DELETE /courses/:id/enroll`
- `GET /courses/:id/roster`

### Schedule

- `GET /schedule`
- `POST /schedule`
- `PUT /schedule/:id`
- `DELETE /schedule/:id`

### Grades and exams

- `GET /exams`
- `POST /exams`
- `PUT /exams/:id`
- `DELETE /exams/:id`
- `GET /grades/student/:studentId`
- `GET /grades/stats/:studentId`
- `POST /grades`

### Attendance

- `GET /attendance/student/:studentId`
- `GET /attendance/management/sessions`
- `GET /attendance/management/session/:scheduleId`
- `POST /attendance/bulk`
- `POST /attendance`

### Messages and notifications

- `GET /announcements`
- `POST /announcements`
- `DELETE /announcements/:id`
- `GET /ops/notifications/me`
- `PATCH /ops/notifications/me/read-all`
- `PATCH /ops/notifications/:id/read`

## 3. Mobile UX expectations

The mobile pilot should favor:

- dashboard snapshot first
- schedule, courses, attendance, grades, and messages as primary tabs
- fewer dense admin tables on phone layouts
- role-aware quick access instead of desktop-style multitool screens

## 4. Chosen path

CampusOS is now using this rollout order:

1. `PWA-first mobile pilot`
2. Validate install flow, navigation, notifications, and everyday usage on phones
3. Wrap the same stable web client with Capacitor later only if store distribution is required

This means the current API contract is intentionally designed to avoid a separate Android-only backend surface.
