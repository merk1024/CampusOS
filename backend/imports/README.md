# CampusOS Pilot Import Workspace

## What goes where

- `templates/` contains sample CSV layouts for pilot imports.
- `inbox/` is the drop folder for temporary university exports.
- `reports/` stores generated JSON and Markdown validation reports.

## Supported files

- `students.csv`, `students.tsv`
- `teachers.csv`, `teachers.tsv`
- `courses.csv`, `courses.tsv`
- `enrollments.csv`, `enrollments.tsv`
- `schedule.csv`, `schedule.tsv`

Excel `.xlsx/.xls` imports are intentionally disabled for security hardening. Convert the needed worksheet to CSV or TSV before running the importer.

## Commands

Preview specific files without writing to the database:

```bash
cd backend
npm run import:pilot -- --students ./imports/templates/students.sample.csv --teachers ./imports/templates/teachers.sample.csv --courses ./imports/templates/courses.sample.csv
```

Preview the full pilot flow, including student selections and schedule records:

```bash
cd backend
npm run import:pilot -- --students ./imports/templates/students.sample.csv --teachers ./imports/templates/teachers.sample.csv --courses ./imports/templates/courses.sample.csv --enrollments ./imports/templates/enrollments.sample.csv --schedule ./imports/templates/schedule.sample.csv
```

Preview everything currently dropped into `imports/inbox`:

```bash
cd backend
npm run import:pilot:preview
```

Run a read-only reconciliation report against the current CampusOS database:

```bash
cd backend
npm run reconcile:pilot -- --students ./imports/templates/students.sample.csv --teachers ./imports/templates/teachers.sample.csv --courses ./imports/templates/courses.sample.csv --enrollments ./imports/templates/enrollments.sample.csv --schedule ./imports/templates/schedule.sample.csv
```

Apply the import to the current database:

```bash
cd backend
set IMPORT_DEFAULT_PASSWORD=ChangeMeNow123!
npm run import:pilot:apply -- --students ./imports/templates/students.sample.csv --teachers ./imports/templates/teachers.sample.csv --courses ./imports/templates/courses.sample.csv --enrollments ./imports/templates/enrollments.sample.csv --schedule ./imports/templates/schedule.sample.csv
```

## Safety rules

- Preview mode is the default.
- No rows are deleted automatically.
- Existing users are matched by `student_id` and/or `email`.
- Existing courses are matched by `code`.
- Enrollment rows are matched by `student_id/email + course_code`.
- Schedule rows are matched by `day + time_slot + group/audience scope + course`.
- New imported users require `IMPORT_DEFAULT_PASSWORD`.
- Reports are always written to `imports/reports`.
- `npm run reconcile:pilot` never writes to the database; it only reports `matched`, `mismatched`, `only in export`, and `only in CampusOS`.
