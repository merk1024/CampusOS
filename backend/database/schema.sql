-- Alatoo University LMS Database Schema (SQLite)

-- Drop existing tables if they exist
DROP TABLE IF EXISTS job_queue;
DROP TABLE IF EXISTS notification_inbox;
DROP TABLE IF EXISTS system_audit_log;
DROP TABLE IF EXISTS schema_migrations;
DROP TABLE IF EXISTS attendance_audit_log;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS assignment_submissions;
DROP TABLE IF EXISTS assignments;
DROP TABLE IF EXISTS announcements;
DROP TABLE IF EXISTS grade_audit_log;
DROP TABLE IF EXISTS grades;
DROP TABLE IF EXISTS exam_students;
DROP TABLE IF EXISTS exams;
DROP TABLE IF EXISTS schedule;
DROP TABLE IF EXISTS course_enrollments;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS users;

-- Users table
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT UNIQUE, -- For students only (e.g., 240145121)
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
    group_name TEXT, -- For students
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
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Courses table
CREATE TABLE courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    credits INTEGER,
    semester TEXT,
    teacher_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Course enrollments
CREATE TABLE course_enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER REFERENCES users(id),
    course_id INTEGER REFERENCES courses(id),
    enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, course_id)
);

-- Exams table
CREATE TABLE exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER REFERENCES courses(id),
    group_name TEXT NOT NULL,
    subject TEXT NOT NULL,
    exam_date DATE NOT NULL,
    exam_time TEXT NOT NULL,
    room TEXT,
    teacher_name TEXT,
    type TEXT DEFAULT 'Экзамен',
    semester TEXT,
    max_grade INTEGER DEFAULT 100,
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Exam students (many-to-many)
CREATE TABLE exam_students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL,
    UNIQUE(exam_id, student_id)
);

-- Grades table
CREATE TABLE grades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id INTEGER REFERENCES exams(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL,
    grade INTEGER CHECK (grade >= 0 AND grade <= 100),
    graded_by INTEGER REFERENCES users(id),
    graded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    comments TEXT,
    UNIQUE(exam_id, student_id)
);

CREATE TABLE grade_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    grade_id INTEGER REFERENCES grades(id) ON DELETE SET NULL,
    exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('created', 'updated')),
    previous_grade INTEGER,
    new_grade INTEGER,
    previous_comments TEXT,
    new_comments TEXT,
    changed_by INTEGER REFERENCES users(id),
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Schedule table
CREATE TABLE schedule (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    group_name TEXT NOT NULL,
    audience_type TEXT DEFAULT 'group',
    subgroup_name TEXT,
    student_user_id INTEGER REFERENCES users(id),
    subject TEXT NOT NULL,
    teacher TEXT,
    room TEXT,
    course_id INTEGER REFERENCES courses(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Assignments table
CREATE TABLE assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER REFERENCES courses(id),
    title TEXT NOT NULL,
    description TEXT,
    due_date DATETIME NOT NULL,
    max_grade INTEGER DEFAULT 100,
    file_path TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Assignment submissions
CREATE TABLE assignment_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES users(id),
    file_path TEXT,
    comments TEXT,
    grade INTEGER CHECK (grade >= 0 AND grade <= 100),
    graded_by INTEGER REFERENCES users(id),
    graded_at DATETIME,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assignment_id, student_id)
);

-- Announcements table
CREATE TABLE announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'general',
    course_id INTEGER REFERENCES courses(id),
    created_by INTEGER REFERENCES users(id),
    is_pinned INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Attendance table
CREATE TABLE attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id INTEGER REFERENCES schedule(id),
    student_id TEXT NOT NULL,
    date DATE NOT NULL,
    status TEXT CHECK (status IN ('present', 'absent', 'late', 'excused')),
    marked_by INTEGER REFERENCES users(id),
    marked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(schedule_id, student_id, date)
);

CREATE TABLE attendance_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attendance_id INTEGER REFERENCES attendance(id) ON DELETE SET NULL,
    schedule_id INTEGER NOT NULL REFERENCES schedule(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL,
    date DATE NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('created', 'updated')),
    previous_status TEXT,
    new_status TEXT NOT NULL,
    changed_by INTEGER REFERENCES users(id),
    changed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE system_audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    action TEXT NOT NULL,
    summary TEXT NOT NULL,
    details TEXT,
    changed_by INTEGER REFERENCES users(id),
    request_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notification_inbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL,
    source_id TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'delivered' CHECK (status IN ('queued', 'delivered', 'failed', 'read')),
    metadata TEXT,
    is_read INTEGER DEFAULT 0,
    delivered_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, source_type, source_id)
);

CREATE TABLE job_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    payload TEXT NOT NULL,
    result_payload TEXT,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    worker_name TEXT,
    available_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    locked_at DATETIME,
    completed_at DATETIME,
    last_error TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE schema_migrations (
    version TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_student_id ON users(student_id);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_exams_date ON exams(exam_date);
CREATE INDEX idx_grades_student ON grades(student_id);
CREATE INDEX idx_grade_audit_student ON grade_audit_log(student_id);
CREATE INDEX idx_schedule_group ON schedule(group_name);
CREATE INDEX idx_assignments_due ON assignments(due_date);
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_attendance_date ON attendance(date);
CREATE INDEX idx_attendance_audit_student ON attendance_audit_log(student_id);
CREATE INDEX idx_system_audit_created_at ON system_audit_log(created_at);
CREATE INDEX idx_system_audit_entity ON system_audit_log(entity_type, entity_id);
CREATE INDEX idx_notification_inbox_user ON notification_inbox(user_id, is_read, created_at);
CREATE INDEX idx_job_queue_status_available ON job_queue(status, available_at, created_at);
