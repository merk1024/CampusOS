# PostgreSQL Migration Notes

For online hosting, use PostgreSQL instead of SQLite.

## Backend environment

Set these variables in `backend/.env` or in your cloud provider:

```env
DB_CLIENT=postgres
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME
JWT_SECRET=change_me
FRONTEND_URL=https://your-frontend-domain.vercel.app
```

`DATABASE_URL` is enough for the app to switch from SQLite to PostgreSQL.

## Startup behavior

On backend startup, the app now:

1. Connects to PostgreSQL
2. Applies `backend/database/schema.postgres.sql`
3. Ensures newer profile and schedule columns still exist

## Demo data

To create demo users, courses, exams, assignments, grades, and schedule:

```bash
cd backend
npm run seed
```

Demo accounts:

- `erbol.abdusaitov1@alatoo.edu.kg / student`
- `teacher@alatoo.edu.kg / teacher`
- `admin@alatoo.edu.kg / admin`

## Suggested hosting

- Frontend: Vercel
- Backend: Render or Railway
- Database: Neon, Supabase Postgres, Railway Postgres, or Render Postgres
