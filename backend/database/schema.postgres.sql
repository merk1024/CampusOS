CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    student_id TEXT UNIQUE,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
    group_name TEXT,
    subgroup_name TEXT,
    phone TEXT,
    avatar TEXT,
    date_of_birth TEXT,
    faculty TEXT,
    major TEXT,
    year_of_study INTEGER,
    address TEXT,
    emergency_contact TEXT,
    father_name TEXT,
    program_class TEXT,
    advisor TEXT,
    study_status TEXT,
    balance_info TEXT,
    grant_type TEXT,
    last_login_at TEXT,
    last_login_ip TEXT,
    registration_date TEXT,
    is_superadmin INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    credits INTEGER,
    semester TEXT,
    teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS course_enrollments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, course_id)
);

CREATE TABLE IF NOT EXISTS exams (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
    group_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    exam_date DATE NOT NULL,
    exam_time TEXT NOT NULL,
    room TEXT,
    teacher_name TEXT,
    type TEXT DEFAULT 'Exam',
    semester TEXT,
    max_grade INTEGER DEFAULT 100,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exam_students (
    id SERIAL PRIMARY KEY,
    exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL,
    UNIQUE(exam_id, student_id)
);

CREATE TABLE IF NOT EXISTS grades (
    id SERIAL PRIMARY KEY,
    exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL,
    grade INTEGER CHECK (grade >= 0 AND grade <= 100),
    graded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    graded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    comments TEXT,
    UNIQUE(exam_id, student_id)
);

CREATE TABLE IF NOT EXISTS schedule (
    id SERIAL PRIMARY KEY,
    day TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    group_name TEXT NOT NULL,
    audience_type TEXT DEFAULT 'group',
    subgroup_name TEXT,
    student_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    teacher TEXT,
    room TEXT,
    course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assignments (
    id SERIAL PRIMARY KEY,
    course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ NOT NULL,
    max_grade INTEGER DEFAULT 100,
    file_path TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assignment_submissions (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    file_path TEXT,
    comments TEXT,
    grade INTEGER CHECK (grade >= 0 AND grade <= 100),
    graded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    graded_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assignment_id, student_id)
);

CREATE TABLE IF NOT EXISTS announcements (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'general',
    course_id INTEGER REFERENCES courses(id) ON DELETE SET NULL,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    schedule_id INTEGER REFERENCES schedule(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL,
    date DATE NOT NULL,
    status TEXT CHECK (status IN ('present', 'absent', 'late', 'excused')),
    marked_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    marked_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(schedule_id, student_id, date)
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_exams_date ON exams(exam_date);
CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_schedule_group ON schedule(group_name);
CREATE INDEX IF NOT EXISTS idx_assignments_due ON assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
