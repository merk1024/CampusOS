

# University Management System Development

**WORKFLOW SKILL** — Guide for building web-based university administrative management systems, including backend APIs and frontend interfaces for managing students, teachers, courses, attendance, grades, schedules, and announcements.

WHEN: creating university management apps, student information systems, academic portals, course management platforms, attendance tracking systems, grade management tools.

DO NOT USE FOR: general web development (use default agent); database design without university context; non-academic management systems.

## Workflow Steps

1. **Project Setup**
   - Initialize backend with Node.js/Express
   - Set up SQLite database with schema for users, courses, attendance, grades, exams, assignments
   - Initialize frontend with React/Vite

2. **Backend Development**
   - Implement JWT-based authentication middleware
   - Create API routes for:
     - Users (students, teachers, admins)
     - Courses management
     - Attendance tracking
     - Grade management
     - Schedule management
     - Announcements
     - Exams and assignments
   - Set up database connections and seeding

3. **Frontend Development**
   - Create login/authentication pages
   - Build management pages for:
     - User management
     - Course management
     - Attendance tracking
     - Schedule viewing/editing
     - Grade viewing
   - Integrate with backend APIs using fetch/axios

4. **Integration and Testing**
   - Connect frontend to backend
   - Test all CRUD operations
   - Validate user roles and permissions (admin, teacher, student)

5. **Deployment Preparation**
   - Configure production settings
   - Set up environment variables for database and JWT secrets
   - Prepare for local deployment or cloud hosting (Azure/AWS)

## Decision Points
- Database: SQLite for simple development, upgrade to MySQL/PostgreSQL for production
- Authentication: JWT for secure, stateless auth
- Frontend: React with CSS modules for styling
- User roles: Student (view own data), Teacher (manage courses/grades), Admin (full access)

## Quality Criteria
- Secure JWT authentication with proper secret management
- Responsive frontend design
- Complete CRUD operations for all entities
- Proper error handling and input validation
- Database relationships correctly implemented (foreign keys)

INVOKES: file system tools for code generation, terminal for running servers, database setup; ask-questions for requirements clarification; subagents for specific implementations.