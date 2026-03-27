# CampusOS External Data Mapping

## Purpose

This document describes how pilot university exports map into the current CampusOS database schema.

The current import pipeline is intentionally limited to:

- students
- teachers
- courses
- course enrollments
- schedule

It does **not** delete existing rows and does **not** import grades, attendance, or assignments yet.

## Import safety model

- Preview is the default mode.
- `npm run import:pilot:preview` is always read-only.
- Existing users are matched by `student_id` and/or `email`.
- Existing courses are matched by `code`.
- New imported users require `IMPORT_DEFAULT_PASSWORD`.
- Passwords are never read from CSV or Excel files.
- Reports are written as JSON and Markdown into `backend/imports/reports`.

## Supported source files

- `students.csv`, `students.xlsx`, `students.xls`
- `teachers.csv`, `teachers.xlsx`, `teachers.xls`
- `courses.csv`, `courses.xlsx`, `courses.xls`
- `enrollments.csv`, `enrollments.xlsx`, `enrollments.xls`
- `schedule.csv`, `schedule.xlsx`, `schedule.xls`

The importer reads the first worksheet by default unless a specific sheet is passed through CLI flags.

## Students mapping

| External field | DB table | DB column | Required | Notes |
| --- | --- | --- | --- | --- |
| `student_id` | `users` | `student_id` | yes | Primary matching key for student imports |
| `name` | `users` | `name` | yes | Trimmed text |
| `email` | `users` | `email` | yes | Lowercased before import |
| `group_name` | `users` | `group_name` | yes | Academic group / cohort |
| `subgroup_name` | `users` | `subgroup_name` | no | Optional subgroup / section |
| `faculty` | `users` | `faculty` | no | Faculty / school |
| `major` | `users` | `major` | no | Program / specialization |
| `year_of_study` | `users` | `year_of_study` | no | Must be a positive integer |
| `phone` | `users` | `phone` | no | Stored as plain text |
| `advisor` | `users` | `advisor` | no | Academic advisor |
| `study_status` | `users` | `study_status` | no | Example: `active`, `leave` |
| `grant_type` | `users` | `grant_type` | no | Example: `grant`, `contract` |
| `program_class` | `users` | `program_class` | no | Internal class label |
| `registration_date` | `users` | `registration_date` | no | Normalized to `YYYY-MM-DD` |
| `date_of_birth` | `users` | `date_of_birth` | no | Normalized to `YYYY-MM-DD` |
| `address` | `users` | `address` | no | Free-form |
| `father_name` | `users` | `father_name` | no | Free-form |

Importer-side defaults:

- `role = student`
- `avatar = initials(name)`
- `is_active = true` (or `1` for SQLite)

## Teachers mapping

| External field | DB table | DB column | Required | Notes |
| --- | --- | --- | --- | --- |
| `name` | `users` | `name` | yes | Trimmed text |
| `email` | `users` | `email` | yes | Lowercased before import |
| `faculty` | `users` | `faculty` | no | Faculty / school |
| `major` / `department` | `users` | `major` | no | Stored in `major` for now |
| `phone` | `users` | `phone` | no | Stored as plain text |
| `address` / `office` | `users` | `address` | no | Office location |
| `advisor` | `users` | `advisor` | no | Optional internal coordinator label |

Importer-side defaults:

- `role = teacher`
- `avatar = initials(name)`
- `is_active = true` (or `1` for SQLite)

## Courses mapping

| External field | DB table | DB column | Required | Notes |
| --- | --- | --- | --- | --- |
| `code` | `courses` | `code` | yes | Primary matching key for course imports |
| `name` | `courses` | `name` | yes | Trimmed text |
| `description` | `courses` | `description` | no | Free-form |
| `credits` | `courses` | `credits` | no | Must be a positive integer |
| `semester` | `courses` | `semester` | no | Example: `Fall 2026` |
| `teacher_email` | derived | `teacher_id` | no | Resolved by teacher email |

Teacher assignment rules:

- If `teacher_email` matches an imported or existing teacher, `courses.teacher_id` is set.
- If `teacher_email` is missing or unresolved, the course is still imported but stays unassigned.
- If the email exists but belongs to a non-teacher account, the importer warns and leaves the course unassigned.

## Course enrollments mapping

| External field | DB table | DB column | Required | Notes |
| --- | --- | --- | --- | --- |
| `student_id` | derived | `course_enrollments.student_id` | one of `student_id` or `student_email` | Resolved to `users.id` |
| `student_email` | derived | `course_enrollments.student_id` | one of `student_id` or `student_email` | Lowercased before matching |
| `course_code` | derived | `course_enrollments.course_id` | yes | Resolved to `courses.id` |
| `enrolled_at` | `course_enrollments` | `enrolled_at` | no | Accepts date or datetime |

Enrollment matching rules:

- Student references can resolve through imported students or existing database rows.
- Course references can resolve through imported courses or existing database rows.
- Existing enrollment rows are matched by `student_id + course_id`.
- If `enrolled_at` is supplied for an existing row, the importer can update it.

## Schedule mapping

| External field | DB table | DB column | Required | Notes |
| --- | --- | --- | --- | --- |
| `course_code` | derived | `schedule.course_id` | yes | Resolved to `courses.id` |
| `day` | `schedule` | `day` | yes | Normalized to `Monday`, `Tuesday`, etc. when recognized |
| `time_slot` | `schedule` | `time_slot` | yes | Raw slot label used by CampusOS |
| `group_name` | `schedule` | `group_name` | yes for `group` / `subgroup` | Auto-derived from student for `individual` rows |
| `audience_type` | `schedule` | `audience_type` | no | Defaults to `group`; supports `group`, `subgroup`, `individual` |
| `subgroup_name` | `schedule` | `subgroup_name` | only for `subgroup` | Required when `audience_type = subgroup` |
| `student_id` / `student_email` | derived | `schedule.student_user_id` | only for `individual` | Resolved to `users.id` |
| `room` | `schedule` | `room` | no | Free-form classroom value |
| `subject` | `schedule` | `subject` | no | Defaults to course name when omitted |
| `teacher` | `schedule` | `teacher` | no | Defaults to assigned teacher when omitted |

Schedule matching rules:

- Existing rows are matched by `day + time_slot + group_name + audience_type + subgroup_name + student_user_id + course_id`.
- Group and subgroup rows require `group_name`.
- Individual rows require a student reference; `group_name` falls back to the student's group when omitted.
- Schedule import is safe for preview mode even when referenced students or courses are part of the same batch.

## Current schema areas not imported yet

These entities remain outside the current pilot import workflow:

- `attendance`
- `exams`
- `grades`
- `assignments`
- `announcements`

Those datasets should stay read-only until the source-of-truth ownership is defined.

## Recommended university export shape

For the first pilot, request:

1. Students export
   - `student_id`
   - `name`
   - `email`
   - `group_name`
   - `subgroup_name`
   - `faculty`
   - `major`
   - `year_of_study`

2. Teachers export
   - `name`
   - `email`
   - `faculty`
   - `department`

3. Courses export
   - `code`
   - `name`
   - `description`
   - `credits`
   - `semester`
   - `teacher_email`

4. Enrollments export
   - `student_id` and/or `student_email`
   - `course_code`
   - `enrolled_at`

5. Schedule export
   - `course_code`
   - `day`
   - `time_slot`
   - `group_name`
   - `audience_type`
   - `subgroup_name`
   - `student_email`
   - `room`
   - `subject`
   - `teacher`

This keeps the first pilot import narrow, testable, and reversible while still covering subject selections and visible timetable data.
