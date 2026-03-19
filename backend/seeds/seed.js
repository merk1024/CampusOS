const bcrypt = require('bcryptjs');
const db = require('../config/database');

const USERS = [
  {
    student_id: '240141052',
    email: 'erbol.abdusaitov1@alatoo.edu.kg',
    password: 'student',
    name: 'Erbol Abdusaitov',
    role: 'student',
    group_name: 'CYB-23',
    subgroup_name: '1-Group',
    phone: '+996555123456',
    avatar: 'EA'
  },
  {
    email: 'teacher@alatoo.edu.kg',
    password: 'teacher',
    name: 'Azhar Kazakbaeva',
    role: 'teacher',
    phone: '+996555123458',
    avatar: 'AK'
  },
  {
    email: 'admin@alatoo.edu.kg',
    password: 'admin',
    name: 'Admin User',
    role: 'admin',
    phone: '+996555123459',
    avatar: 'AU'
  }
];

const COURSES = [
  {
    code: 'CS101',
    name: 'Programming Language 2',
    description: 'Advanced programming concepts',
    credits: 3,
    semester: 'Spring 2025-2026',
    teacherEmail: 'teacher@alatoo.edu.kg'
  },
  {
    code: 'MATH201',
    name: 'Calculus 2',
    description: 'Integral calculus and series',
    credits: 4,
    semester: 'Spring 2025-2026',
    teacherEmail: 'teacher@alatoo.edu.kg'
  },
  {
    code: 'WEB101',
    name: 'Web Development',
    description: 'Modern web technologies',
    credits: 3,
    semester: 'Spring 2025-2026',
    teacherEmail: 'teacher@alatoo.edu.kg'
  }
];

const EXAMS = [
  {
    courseCode: 'CS101',
    group_name: 'CYB-23',
    subject: 'Programming Language 2',
    exam_date: '2026-02-20',
    exam_time: '10:00',
    room: 'BIGLAB',
    teacher_name: 'Azhar Kazakbaeva',
    type: 'Exam',
    semester: 'Spring 2025-2026'
  },
  {
    courseCode: 'MATH201',
    group_name: 'CYB-23',
    subject: 'Calculus 2',
    exam_date: '2026-02-25',
    exam_time: '14:00',
    room: 'B107',
    teacher_name: 'Hussien Chebsi',
    type: 'Exam',
    semester: 'Spring 2025-2026'
  },
  {
    courseCode: 'WEB101',
    group_name: 'CYB-23',
    subject: 'Web Development',
    exam_date: '2026-03-10',
    exam_time: '11:00',
    room: 'B205',
    teacher_name: 'Azhar Kazakbaeva',
    type: 'Pass/Fail',
    semester: 'Spring 2025-2026'
  }
];

const SCHEDULE_ENTRIES = [
  ['Monday', '08:00-08:40', 'Programming Language 2', 'Azhar Kazakbaeva', 'BIGLAB'],
  ['Monday', '08:45-09:25', 'Calculus 2', 'Hussien Chebsi', 'B107'],
  ['Monday', '09:30-10:10', 'English for Engineers', 'Aizada Asanbekova', 'A201'],
  ['Tuesday', '08:00-08:40', 'Algorithms', 'John Smith', 'A105'],
  ['Tuesday', '08:45-09:25', 'Database Systems', 'Sarah Wilson', 'B301'],
  ['Wednesday', '08:00-08:40', 'Programming Language 2 Lab', 'Azhar Kazakbaeva', 'BIGLAB'],
  ['Wednesday', '08:45-09:25', 'Calculus 2', 'Hussien Chebsi', 'B107'],
  ['Thursday', '08:00-08:40', 'Computer Networks', 'David Brown', 'C102'],
  ['Thursday', '08:45-09:25', 'Software Engineering', 'Lisa Davis', 'A203'],
  ['Friday', '08:00-08:40', 'Web Development Lab', 'Maria Johnson', 'B205']
];

const ANNOUNCEMENTS = [
  {
    title: 'Welcome to the LMS',
    content: 'Track your courses, assignments, exams, grades, and schedule in one place.',
    type: 'general',
    is_pinned: true
  },
  {
    title: 'Schedule update',
    content: 'Please double-check Monday classes before coming to campus.',
    type: 'important',
    is_pinned: false
  }
];

const ASSIGNMENTS = [
  {
    courseCode: 'CS101',
    title: 'Programming Language 2 - Lab 3',
    description: 'Complete the OOP exercises and submit your code.',
    due_date: '2026-02-15T23:59:00Z',
    max_grade: 100
  },
  {
    courseCode: 'MATH201',
    title: 'Calculus 2 - Problem Set 5',
    description: 'Solve integrals and differential equations from chapters 7-8.',
    due_date: '2026-02-18T23:59:00Z',
    max_grade: 50
  }
];

const GRADES = [
  { subject: 'Programming Language 2', student_id: '240141052', grade: 85 },
  { subject: 'Calculus 2', student_id: '240141052', grade: 78 },
  { subject: 'Web Development', student_id: '240141052', grade: 92 }
];

async function findUserByEmail(email) {
  return db.get('SELECT * FROM users WHERE email = ?', [email]);
}

async function ensureUser(user, hashedPassword) {
  const existing = await findUserByEmail(user.email);
  if (existing) {
    return existing;
  }

  await db.run(
    `INSERT INTO users (
      student_id, email, password, name, role, group_name, subgroup_name, phone, avatar
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      user.student_id || null,
      user.email,
      hashedPassword,
      user.name,
      user.role,
      user.group_name || null,
      user.subgroup_name || null,
      user.phone || null,
      user.avatar || null
    ]
  );

  return findUserByEmail(user.email);
}

async function ensureCourse(course, teacherId) {
  const existing = await db.get('SELECT * FROM courses WHERE code = ?', [course.code]);
  if (existing) {
    return existing;
  }

  await db.run(
    'INSERT INTO courses (code, name, description, credits, semester, teacher_id) VALUES (?, ?, ?, ?, ?, ?)',
    [course.code, course.name, course.description, course.credits, course.semester, teacherId]
  );

  return db.get('SELECT * FROM courses WHERE code = ?', [course.code]);
}

async function ensureExam(exam, courseId, createdBy) {
  const existing = await db.get(
    'SELECT * FROM exams WHERE subject = ? AND exam_date = ? AND exam_time = ?',
    [exam.subject, exam.exam_date, exam.exam_time]
  );

  if (existing) {
    return existing;
  }

  await db.run(
    `INSERT INTO exams (
      course_id, group_name, subject, exam_date, exam_time, room, teacher_name, type, semester, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      courseId,
      exam.group_name,
      exam.subject,
      exam.exam_date,
      exam.exam_time,
      exam.room,
      exam.teacher_name,
      exam.type,
      exam.semester,
      createdBy
    ]
  );

  return db.get(
    'SELECT * FROM exams WHERE subject = ? AND exam_date = ? AND exam_time = ?',
    [exam.subject, exam.exam_date, exam.exam_time]
  );
}

async function ensureExamStudent(examId, studentId) {
  const existing = await db.get(
    'SELECT id FROM exam_students WHERE exam_id = ? AND student_id = ?',
    [examId, studentId]
  );

  if (!existing) {
    await db.run(
      'INSERT INTO exam_students (exam_id, student_id) VALUES (?, ?)',
      [examId, studentId]
    );
  }
}

async function ensureGrade(examId, studentId, grade, gradedBy) {
  const existing = await db.get(
    'SELECT id FROM grades WHERE exam_id = ? AND student_id = ?',
    [examId, studentId]
  );

  if (existing) {
    await db.run(
      'UPDATE grades SET grade = ?, graded_by = ?, graded_at = CURRENT_TIMESTAMP WHERE exam_id = ? AND student_id = ?',
      [grade, gradedBy, examId, studentId]
    );
    return;
  }

  await db.run(
    'INSERT INTO grades (exam_id, student_id, grade, graded_by) VALUES (?, ?, ?, ?)',
    [examId, studentId, grade, gradedBy]
  );
}

async function ensureScheduleEntry(day, timeSlot, subject, teacher, room) {
  const existing = await db.get(
    'SELECT id FROM schedule WHERE day = ? AND time_slot = ? AND group_name = ? AND subject = ?',
    [day, timeSlot, 'CYB-23', subject]
  );

  if (!existing) {
    await db.run(
      'INSERT INTO schedule (day, time_slot, group_name, subject, teacher, room) VALUES (?, ?, ?, ?, ?, ?)',
      [day, timeSlot, 'CYB-23', subject, teacher, room]
    );
  }
}

async function ensureAnnouncement(item, createdBy) {
  const existing = await db.get('SELECT id FROM announcements WHERE title = ?', [item.title]);
  if (!existing) {
    await db.run(
      'INSERT INTO announcements (title, content, type, is_pinned, created_by) VALUES (?, ?, ?, ?, ?)',
      [item.title, item.content, item.type, item.is_pinned, createdBy]
    );
  }
}

async function ensureAssignment(item, courseId, createdBy) {
  const existing = await db.get(
    'SELECT id FROM assignments WHERE title = ? AND course_id = ?',
    [item.title, courseId]
  );

  if (!existing) {
    await db.run(
      'INSERT INTO assignments (course_id, title, description, due_date, max_grade, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [courseId, item.title, item.description, item.due_date, item.max_grade, createdBy]
    );
  }
}

async function seed() {
  try {
    console.log('Starting database seeding...');
    await db.migrate();

    const salt = await bcrypt.genSalt(10);
    const passwordMap = new Map();

    for (const user of USERS) {
      passwordMap.set(user.email, await bcrypt.hash(user.password, salt));
    }

    const createdUsers = new Map();
    for (const user of USERS) {
      const created = await ensureUser(user, passwordMap.get(user.email));
      createdUsers.set(user.email, created);
    }

    const teacher = createdUsers.get('teacher@alatoo.edu.kg');
    const admin = createdUsers.get('admin@alatoo.edu.kg');
    const student = createdUsers.get('erbol.abdusaitov1@alatoo.edu.kg');

    const createdCourses = new Map();
    for (const course of COURSES) {
      const created = await ensureCourse(course, teacher.id);
      createdCourses.set(course.code, created);
    }

    const createdExams = new Map();
    for (const exam of EXAMS) {
      const created = await ensureExam(exam, createdCourses.get(exam.courseCode).id, teacher.id);
      createdExams.set(exam.subject, created);
      await ensureExamStudent(created.id, student.student_id);
    }

    for (const grade of GRADES) {
      await ensureGrade(createdExams.get(grade.subject).id, grade.student_id, grade.grade, teacher.id);
    }

    for (const [day, timeSlot, subject, teacherName, room] of SCHEDULE_ENTRIES) {
      await ensureScheduleEntry(day, timeSlot, subject, teacherName, room);
    }

    for (const announcement of ANNOUNCEMENTS) {
      await ensureAnnouncement(announcement, admin.id);
    }

    for (const assignment of ASSIGNMENTS) {
      await ensureAssignment(assignment, createdCourses.get(assignment.courseCode).id, teacher.id);
    }

    console.log('Database seeding completed successfully.');
    console.log('');
    console.log('Test accounts:');
    console.log('  Student: erbol.abdusaitov1@alatoo.edu.kg / student');
    console.log('  Teacher: teacher@alatoo.edu.kg / teacher');
    console.log('  Admin:   admin@alatoo.edu.kg / admin');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

if (require.main === module) {
  seed()
    .then(() => {
      console.log('Seeding complete.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seed;
