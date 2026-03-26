const bcrypt = require('bcryptjs');

const db = require('../config/database');
const { SUPERADMIN_EMAIL } = require('../utils/access');

const ACTIVE_STATUS = db.client === 'postgres' ? true : 1;
const FACULTY = 'School of Engineering and Applied Sciences';

const ACCOUNTS = [
  {
    email: process.env.SUPERADMIN_EMAIL || SUPERADMIN_EMAIL,
    password_env: 'SUPERADMIN_BOOTSTRAP_PASSWORD',
    name: process.env.SUPERADMIN_NAME || 'Erbol Abdusatov',
    role: 'admin',
    avatar: 'EA',
    is_superadmin: 1
  },
  {
    email: 'admin@alatoo.edu.kg',
    password_env: 'SEED_ADMIN_PASSWORD',
    name: 'CampusOS Admin',
    role: 'admin',
    avatar: 'CA'
  },
  {
    email: 'teacher@alatoo.edu.kg',
    password_env: 'SEED_TEACHER_PASSWORD',
    name: 'Azhar Kazakbaeva',
    role: 'teacher',
    avatar: 'AK',
    faculty: FACULTY,
    major: 'Cybersecurity'
  },
  {
    email: 'askar.eskendirov@alatoo.edu.kg',
    password_env: 'SEED_TEACHER_PASSWORD',
    name: 'Askar Eskendirov',
    role: 'teacher',
    avatar: 'AE',
    faculty: FACULTY,
    major: 'Networks and Infrastructure'
  },
  {
    email: 'diana.sadykova@alatoo.edu.kg',
    password_env: 'SEED_TEACHER_PASSWORD',
    name: 'Diana Sadykova',
    role: 'teacher',
    avatar: 'DS',
    faculty: FACULTY,
    major: 'Data Science'
  },
  {
    email: 'nurlan.toktonaliev@alatoo.edu.kg',
    password_env: 'SEED_TEACHER_PASSWORD',
    name: 'Nurlan Toktonaliev',
    role: 'teacher',
    avatar: 'NT',
    faculty: FACULTY,
    major: 'Software Engineering'
  },
  {
    student_id: '240141052',
    email: 'erbol.abdusaitov1@alatoo.edu.kg',
    password_env: 'SEED_STUDENT_PASSWORD',
    name: 'Erbol Abdusaitov',
    role: 'student',
    group_name: 'CYB-23',
    subgroup_name: '1-Group',
    avatar: 'EA',
    faculty: FACULTY,
    major: 'Cybersecurity',
    year_of_study: 3
  },
  {
    student_id: '240141053',
    email: 'aida.bekmuratova@alatoo.edu.kg',
    password_env: 'SEED_STUDENT_PASSWORD',
    name: 'Aida Bekmuratova',
    role: 'student',
    group_name: 'CYB-23',
    subgroup_name: '1-Group',
    avatar: 'AB',
    faculty: FACULTY,
    major: 'Cybersecurity',
    year_of_study: 3
  },
  {
    student_id: '240141054',
    email: 'nursultan.omurzakov@alatoo.edu.kg',
    password_env: 'SEED_STUDENT_PASSWORD',
    name: 'Nursultan Omurzakov',
    role: 'student',
    group_name: 'CYB-23',
    subgroup_name: '1-Group',
    avatar: 'NO',
    faculty: FACULTY,
    major: 'Cybersecurity',
    year_of_study: 3
  },
  {
    student_id: '240141055',
    email: 'elina.toktosunova@alatoo.edu.kg',
    password_env: 'SEED_STUDENT_PASSWORD',
    name: 'Elina Toktosunova',
    role: 'student',
    group_name: 'CYB-23',
    subgroup_name: '1-Group',
    avatar: 'ET',
    faculty: FACULTY,
    major: 'Cybersecurity',
    year_of_study: 3
  },
  {
    student_id: '240141056',
    email: 'timur.asanov@alatoo.edu.kg',
    password_env: 'SEED_STUDENT_PASSWORD',
    name: 'Timur Asanov',
    role: 'student',
    group_name: 'CYB-23',
    subgroup_name: '2-Group',
    avatar: 'TA',
    faculty: FACULTY,
    major: 'Cybersecurity',
    year_of_study: 3
  },
  {
    student_id: '240141057',
    email: 'madina.saparova@alatoo.edu.kg',
    password_env: 'SEED_STUDENT_PASSWORD',
    name: 'Madina Saparova',
    role: 'student',
    group_name: 'CYB-23',
    subgroup_name: '2-Group',
    avatar: 'MS',
    faculty: FACULTY,
    major: 'Cybersecurity',
    year_of_study: 3
  },
  {
    student_id: '240141058',
    email: 'daniyar.kasymov@alatoo.edu.kg',
    password_env: 'SEED_STUDENT_PASSWORD',
    name: 'Daniyar Kasymov',
    role: 'student',
    group_name: 'CYB-23',
    subgroup_name: '2-Group',
    avatar: 'DK',
    faculty: FACULTY,
    major: 'Cybersecurity',
    year_of_study: 3
  },
  {
    student_id: '240141059',
    email: 'aizirek.iskakova@alatoo.edu.kg',
    password_env: 'SEED_STUDENT_PASSWORD',
    name: 'Aizirek Iskakova',
    role: 'student',
    group_name: 'CYB-23',
    subgroup_name: '2-Group',
    avatar: 'AI',
    faculty: FACULTY,
    major: 'Cybersecurity',
    year_of_study: 3
  },
  {
    student_id: '240141060',
    email: 'bekzat.umetaliev@alatoo.edu.kg',
    password_env: 'SEED_STUDENT_PASSWORD',
    name: 'Bekzat Umetaliev',
    role: 'student',
    group_name: 'SE-23',
    subgroup_name: '1-Group',
    avatar: 'BU',
    faculty: FACULTY,
    major: 'Software Engineering',
    year_of_study: 3
  },
  {
    student_id: '240141061',
    email: 'alina.janybekova@alatoo.edu.kg',
    password_env: 'SEED_STUDENT_PASSWORD',
    name: 'Alina Janybekova',
    role: 'student',
    group_name: 'SE-23',
    subgroup_name: '1-Group',
    avatar: 'AJ',
    faculty: FACULTY,
    major: 'Software Engineering',
    year_of_study: 3
  },
  {
    student_id: '240141062',
    email: 'ruslan.kudaibergenov@alatoo.edu.kg',
    password_env: 'SEED_STUDENT_PASSWORD',
    name: 'Ruslan Kudaibergenov',
    role: 'student',
    group_name: 'SE-23',
    subgroup_name: '1-Group',
    avatar: 'RK',
    faculty: FACULTY,
    major: 'Software Engineering',
    year_of_study: 3
  },
  {
    student_id: '240141063',
    email: 'meerim.ryskulova@alatoo.edu.kg',
    password_env: 'SEED_STUDENT_PASSWORD',
    name: 'Meerim Ryskulova',
    role: 'student',
    group_name: 'SE-23',
    subgroup_name: '2-Group',
    avatar: 'MR',
    faculty: FACULTY,
    major: 'Software Engineering',
    year_of_study: 3
  },
  {
    student_id: '240141064',
    email: 'adilet.turgunbaev@alatoo.edu.kg',
    password_env: 'SEED_STUDENT_PASSWORD',
    name: 'Adilet Turgunbaev',
    role: 'student',
    group_name: 'SE-23',
    subgroup_name: '2-Group',
    avatar: 'AT',
    faculty: FACULTY,
    major: 'Software Engineering',
    year_of_study: 3
  }
];

const COURSES = [
  {
    code: 'CYB201',
    name: 'Cybersecurity Fundamentals',
    description: 'Core security principles, threat modeling, and applied defense workflows.',
    credits: 4,
    semester: 'Spring 2026',
    teacherEmail: 'teacher@alatoo.edu.kg'
  },
  {
    code: 'NET220',
    name: 'Network Defense',
    description: 'Monitoring, segmentation, incident response, and secure network design.',
    credits: 4,
    semester: 'Spring 2026',
    teacherEmail: 'askar.eskendirov@alatoo.edu.kg'
  },
  {
    code: 'WEB310',
    name: 'Secure Web Development',
    description: 'Building resilient web apps with secure auth, input validation, and testing.',
    credits: 3,
    semester: 'Spring 2026',
    teacherEmail: 'nurlan.toktonaliev@alatoo.edu.kg'
  },
  {
    code: 'DAT305',
    name: 'Academic Data Analytics',
    description: 'Practical analytics, dashboards, and data interpretation for campus systems.',
    credits: 3,
    semester: 'Spring 2026',
    teacherEmail: 'diana.sadykova@alatoo.edu.kg'
  },
  {
    code: 'DEV230',
    name: 'DevOps Fundamentals',
    description: 'Version control, CI/CD, environments, and deployment basics for web teams.',
    credits: 3,
    semester: 'Spring 2026',
    teacherEmail: 'nurlan.toktonaliev@alatoo.edu.kg'
  },
  {
    code: 'UX210',
    name: 'Human-Computer Interaction',
    description: 'User journeys, interface critiques, prototyping, and accessibility basics.',
    credits: 3,
    semester: 'Spring 2026',
    teacherEmail: 'diana.sadykova@alatoo.edu.kg'
  }
];

const ENROLLMENTS = {
  'erbol.abdusaitov1@alatoo.edu.kg': ['CYB201', 'NET220', 'WEB310'],
  'aida.bekmuratova@alatoo.edu.kg': ['CYB201', 'NET220', 'WEB310'],
  'nursultan.omurzakov@alatoo.edu.kg': ['CYB201', 'NET220', 'WEB310'],
  'elina.toktosunova@alatoo.edu.kg': ['CYB201', 'NET220', 'WEB310'],
  'timur.asanov@alatoo.edu.kg': ['CYB201', 'NET220', 'DAT305'],
  'madina.saparova@alatoo.edu.kg': ['CYB201', 'NET220', 'DAT305'],
  'daniyar.kasymov@alatoo.edu.kg': ['CYB201', 'NET220', 'DAT305'],
  'aizirek.iskakova@alatoo.edu.kg': ['CYB201', 'NET220', 'DAT305'],
  'bekzat.umetaliev@alatoo.edu.kg': ['DEV230', 'UX210', 'DAT305'],
  'alina.janybekova@alatoo.edu.kg': ['DEV230', 'UX210', 'DAT305'],
  'ruslan.kudaibergenov@alatoo.edu.kg': ['DEV230', 'UX210', 'DAT305'],
  'meerim.ryskulova@alatoo.edu.kg': ['DEV230', 'UX210'],
  'adilet.turgunbaev@alatoo.edu.kg': ['DEV230', 'UX210']
};

const SCHEDULE_BLUEPRINTS = [
  {
    courseCode: 'CYB201',
    day: 'Monday',
    slots: ['08:00-08:40', '08:45-09:25'],
    group_name: 'CYB-23',
    audience_type: 'group',
    room: 'A-301'
  },
  {
    courseCode: 'NET220',
    day: 'Tuesday',
    slots: ['10:15-10:55', '11:00-11:40'],
    group_name: 'CYB-23',
    audience_type: 'group',
    room: 'A-204'
  },
  {
    courseCode: 'WEB310',
    day: 'Wednesday',
    slots: ['13:10-13:55', '14:00-14:40'],
    group_name: 'CYB-23',
    audience_type: 'subgroup',
    subgroup_name: '1-Group',
    room: 'Lab-2'
  },
  {
    courseCode: 'DAT305',
    day: 'Thursday',
    slots: ['13:10-13:55', '14:00-14:40'],
    group_name: 'CYB-23',
    audience_type: 'subgroup',
    subgroup_name: '2-Group',
    room: 'Data-1'
  },
  {
    courseCode: 'DEV230',
    day: 'Monday',
    slots: ['11:45-12:25', '12:30-13:10'],
    group_name: 'SE-23',
    audience_type: 'group',
    room: 'B-110'
  },
  {
    courseCode: 'UX210',
    day: 'Friday',
    slots: ['09:30-10:10', '10:15-10:55'],
    group_name: 'SE-23',
    audience_type: 'group',
    room: 'Media-3'
  },
  {
    courseCode: 'DAT305',
    day: 'Wednesday',
    slots: ['15:30-16:10'],
    group_name: 'SE-23',
    audience_type: 'group',
    room: 'Analytics Hub'
  },
  {
    courseCode: 'CYB201',
    day: 'Thursday',
    slots: ['16:15-16:55'],
    group_name: 'CYB-23',
    audience_type: 'individual',
    studentEmail: 'erbol.abdusaitov1@alatoo.edu.kg',
    room: 'Mentor Room'
  },
  {
    courseCode: 'UX210',
    day: 'Friday',
    slots: ['14:45-15:25'],
    group_name: 'SE-23',
    audience_type: 'individual',
    studentEmail: 'alina.janybekova@alatoo.edu.kg',
    room: 'Design Studio'
  }
];

async function findUserByEmail(email) {
  return db.get('SELECT * FROM users WHERE email = ?', [email]);
}

async function findCourseByCode(code) {
  return db.get('SELECT * FROM courses WHERE code = ?', [code]);
}

function getSeedPassword(account) {
  const envKey = account.password_env;
  const password = String(process.env[envKey] || '').trim();

  if (!password) {
    throw new Error(
      `Missing required environment variable ${envKey} for seeded account ${account.email}.`
    );
  }

  return password;
}

async function ensureUser(user, hashedPassword) {
  const existing = await findUserByEmail(user.email);

  if (existing) {
    const fields = [
      'student_id = ?',
      'name = ?',
      'role = ?',
      'group_name = ?',
      'subgroup_name = ?',
      'avatar = ?',
      'faculty = ?',
      'major = ?',
      'year_of_study = ?',
      'is_active = ?',
      'updated_at = CURRENT_TIMESTAMP'
    ];
    const values = [
      user.student_id || null,
      user.name,
      user.role,
      user.group_name || null,
      user.subgroup_name || null,
      user.avatar || null,
      user.faculty || null,
      user.major || null,
      user.year_of_study || null,
      ACTIVE_STATUS
    ];

    if (user.is_superadmin) {
      fields.push('is_superadmin = 1');
    }

    await db.run(
      `UPDATE users
       SET ${fields.join(', ')}
       WHERE id = ?`,
      [...values, existing.id]
    );

    return findUserByEmail(user.email);
  }

  await db.run(
    `INSERT INTO users (
      student_id, email, password, name, role, group_name, subgroup_name, avatar,
      faculty, major, year_of_study, is_superadmin
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      user.student_id || null,
      user.email,
      hashedPassword,
      user.name,
      user.role,
      user.group_name || null,
      user.subgroup_name || null,
      user.avatar || null,
      user.faculty || null,
      user.major || null,
      user.year_of_study || null,
      user.is_superadmin || 0
    ]
  );

  return findUserByEmail(user.email);
}

async function ensureCourse(course, teacherIdsByEmail) {
  const teacherId = teacherIdsByEmail.get(course.teacherEmail) || null;
  const existing = await findCourseByCode(course.code);

  if (existing) {
    await db.run(
      `UPDATE courses
       SET name = ?,
           description = ?,
           credits = ?,
           semester = ?,
           teacher_id = ?
       WHERE id = ?`,
      [
        course.name,
        course.description,
        course.credits,
        course.semester,
        teacherId,
        existing.id
      ]
    );

    return findCourseByCode(course.code);
  }

  await db.run(
    `INSERT INTO courses (code, name, description, credits, semester, teacher_id)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      course.code,
      course.name,
      course.description,
      course.credits,
      course.semester,
      teacherId
    ]
  );

  return findCourseByCode(course.code);
}

async function ensureEnrollment(studentId, courseId) {
  const existing = await db.get(
    'SELECT id FROM course_enrollments WHERE student_id = ? AND course_id = ?',
    [studentId, courseId]
  );

  if (!existing) {
    await db.run(
      'INSERT INTO course_enrollments (student_id, course_id) VALUES (?, ?)',
      [studentId, courseId]
    );
  }
}

async function ensureScheduleEntry(entry) {
  const existing = await db.get(
    `SELECT id
     FROM schedule
     WHERE day = ?
       AND time_slot = ?
       AND COALESCE(group_name, '') = COALESCE(?, '')
       AND COALESCE(audience_type, 'group') = COALESCE(?, 'group')
       AND COALESCE(subgroup_name, '') = COALESCE(?, '')
       AND COALESCE(student_user_id, 0) = COALESCE(?, 0)
       AND COALESCE(course_id, 0) = COALESCE(?, 0)`,
    [
      entry.day,
      entry.time_slot,
      entry.group_name,
      entry.audience_type,
      entry.subgroup_name || null,
      entry.student_user_id || null,
      entry.course_id || null
    ]
  );

  if (existing) {
    await db.run(
      `UPDATE schedule
       SET subject = ?,
           teacher = ?,
           room = ?,
           group_name = ?,
           audience_type = ?,
           subgroup_name = ?,
           student_user_id = ?,
           course_id = ?
       WHERE id = ?`,
      [
        entry.subject,
        entry.teacher,
        entry.room,
        entry.group_name,
        entry.audience_type,
        entry.subgroup_name || null,
        entry.student_user_id || null,
        entry.course_id || null,
        existing.id
      ]
    );
    return;
  }

  await db.run(
    `INSERT INTO schedule (
      day, time_slot, group_name, audience_type, subgroup_name, student_user_id, subject, teacher, room, course_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.day,
      entry.time_slot,
      entry.group_name,
      entry.audience_type,
      entry.subgroup_name || null,
      entry.student_user_id || null,
      entry.subject,
      entry.teacher,
      entry.room,
      entry.course_id || null
    ]
  );
}

async function seedUsers() {
  const salt = await bcrypt.genSalt(10);
  const usersByEmail = new Map();

  for (const account of ACCOUNTS) {
    const existing = await findUserByEmail(account.email);
    const hashedPassword = existing
      ? existing.password
      : await bcrypt.hash(getSeedPassword(account), salt);
    const user = await ensureUser(account, hashedPassword);
    usersByEmail.set(user.email, user);
  }

  return usersByEmail;
}

async function seedCourses(usersByEmail) {
  const teacherIdsByEmail = new Map(
    [...usersByEmail.values()]
      .filter((user) => user.role === 'teacher')
      .map((user) => [user.email, user.id])
  );
  const coursesByCode = new Map();

  for (const course of COURSES) {
    const created = await ensureCourse(course, teacherIdsByEmail);
    coursesByCode.set(created.code, created);
  }

  return coursesByCode;
}

async function seedEnrollments(usersByEmail, coursesByCode) {
  for (const [studentEmail, courseCodes] of Object.entries(ENROLLMENTS)) {
    const student = usersByEmail.get(studentEmail);
    if (!student) {
      continue;
    }

    for (const courseCode of courseCodes) {
      const course = coursesByCode.get(courseCode);
      if (!course) {
        continue;
      }

      await ensureEnrollment(student.id, course.id);
    }
  }
}

async function seedSchedule(usersByEmail, coursesByCode) {
  for (const blueprint of SCHEDULE_BLUEPRINTS) {
    const course = coursesByCode.get(blueprint.courseCode);
    if (!course) {
      continue;
    }

    const teacher = ACCOUNTS.find((account) => account.email === COURSES.find((item) => item.code === blueprint.courseCode)?.teacherEmail);
    const student = blueprint.studentEmail ? usersByEmail.get(blueprint.studentEmail) : null;

    for (const slot of blueprint.slots) {
      await ensureScheduleEntry({
        day: blueprint.day,
        time_slot: slot,
        group_name: blueprint.group_name || student?.group_name || 'INDIVIDUAL',
        audience_type: blueprint.audience_type || 'group',
        subgroup_name: blueprint.audience_type === 'subgroup' ? blueprint.subgroup_name : null,
        student_user_id: blueprint.audience_type === 'individual' ? student?.id || null : null,
        subject: course.name,
        teacher: teacher?.name || 'Teacher not assigned',
        room: blueprint.room,
        course_id: course.id
      });
    }
  }
}

async function seed() {
  try {
    console.log('Starting CampusOS demo seed...');
    await db.migrate();

    const usersByEmail = await seedUsers();
    const coursesByCode = await seedCourses(usersByEmail);
    await seedEnrollments(usersByEmail, coursesByCode);
    await seedSchedule(usersByEmail, coursesByCode);

    const studentsCount = [...usersByEmail.values()].filter((user) => user.role === 'student').length;
    const teachersCount = [...usersByEmail.values()].filter((user) => user.role === 'teacher').length;

    console.log('CampusOS demo seed completed successfully.');
    console.log('');
    console.log(`Students: ${studentsCount}`);
    console.log(`Teachers: ${teachersCount}`);
    console.log(`Courses: ${coursesByCode.size}`);
    console.log('');
    console.log('Seeded account summary:');
    console.log(`  Super Admin: ${process.env.SUPERADMIN_EMAIL || SUPERADMIN_EMAIL}`);
    console.log('  Admin, teacher, and student passwords are loaded from environment variables only.');
  } catch (error) {
    console.error('Error seeding demo data:', error);
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
