# CampusOS Backup and Restore Playbook

## Purpose

This playbook defines the safe backup and restore flow for both SQLite and PostgreSQL deployments.

## SQLite

### Create a backup

```powershell
npm run backup:campusos -- -Mode sqlite
```

Optional explicit output path:

```powershell
npm run backup:campusos -- -Mode sqlite -OutputPath .\backups\campusos-local.db
```

### Restore a backup

```powershell
npm run restore:campusos -- -Mode sqlite -InputPath .\backups\campusos-local.db
```

## PostgreSQL

### Requirements

- `DATABASE_URL` must be set
- `pg_dump` must be available for backup
- `psql` must be available for restore

### Create a backup

```powershell
npm run backup:campusos -- -Mode postgres
```

Optional explicit output path:

```powershell
npm run backup:campusos -- -Mode postgres -OutputPath .\backups\campusos-production.sql
```

### Restore a backup

```powershell
npm run restore:campusos -- -Mode postgres -InputPath .\backups\campusos-production.sql
```

## Safe restore checklist

1. Confirm you are targeting the correct environment.
2. Take a fresh backup before any restore.
3. Stop write traffic if possible before restoring production data.
4. Run `npm run verify:web` after restore.
5. Re-check `/health`, `/ready`, and at least one real login.
