# CampusOS Pilot Import Workspace

## What goes where

- `templates/` contains sample CSV layouts that can also be used as Excel header references.
- `inbox/` is the drop folder for temporary university exports.
- `reports/` stores generated JSON and Markdown validation reports.

## Supported files

- `students.csv`, `students.xlsx`, `students.xls`
- `teachers.csv`, `teachers.xlsx`, `teachers.xls`
- `courses.csv`, `courses.xlsx`, `courses.xls`

The importer reads the first worksheet by default. You can override it with:

- `--students-sheet`
- `--teachers-sheet`
- `--courses-sheet`

## Commands

Preview specific files without writing to the database:

```bash
cd backend
npm run import:pilot -- --students ./imports/templates/students.sample.csv --teachers ./imports/templates/teachers.sample.csv --courses ./imports/templates/courses.sample.csv
```

Preview everything currently dropped into `imports/inbox`:

```bash
cd backend
npm run import:pilot:preview
```

Apply the import to the current database:

```bash
cd backend
set IMPORT_DEFAULT_PASSWORD=ChangeMeNow123!
npm run import:pilot:apply -- --students ./imports/templates/students.sample.csv --teachers ./imports/templates/teachers.sample.csv --courses ./imports/templates/courses.sample.csv
```

## Safety rules

- Preview mode is the default.
- No rows are deleted automatically.
- Existing users are matched by `student_id` and/or `email`.
- Existing courses are matched by `code`.
- New imported users require `IMPORT_DEFAULT_PASSWORD`.
- Reports are always written to `imports/reports`.
