const bcrypt = require('bcryptjs');

const db = require('../config/database');
const {
  ACCOUNTS,
  ASSIGNMENT_BLUEPRINTS,
  ATTENDANCE_SCENARIOS,
  ATTENDANCE_STUDENT_PATTERNS,
  COURSES,
  COURSE_BLUEPRINTS_BY_CODE,
  ENROLLMENTS,
  EXAM_BLUEPRINTS,
  FALLBACK_ATTENDANCE_PATTERN,
  GRADE_BLUEPRINTS,
  PRESENTATION_SEMESTER,
  SCHEDULE_BLUEPRINTS,
  WEEKDAY_INDEX_BY_NAME
} = require('./seedData');

const ACTIVE_STATUS = db.client === 'postgres' ? true : 1;

function startOfDay(value = new Date()) {
  let date;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    date = new Date(year, month - 1, day);
  } else {
    date = new Date(value);
  }

  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(value, offset) {
  const date = new Date(value);
  date.setDate(date.getDate() + offset);
  return date;
}

function formatDateOnly(value) {
  const date = startOfDay(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toIsoAtTime(dateValue, timeValue) {
  const [hours, minutes] = String(timeValue || '00:00').split(':').map(Number);
  const date = startOfDay(dateValue);
  date.setHours(Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0, 0, 0);
  return date.toISOString();
}

function getRecentWeekdayDates(dayName, count) {
  const targetDay = WEEKDAY_INDEX_BY_NAME[dayName];
  if (!Number.isInteger(targetDay) || count <= 0) {
    return [];
  }

  const dates = [];
  let cursor = startOfDay(new Date());
  cursor = addDays(cursor, -1);

  while (dates.length < count) {
    if (cursor.getDay() === targetDay) {
      dates.push(formatDateOnly(cursor));
    }

    cursor = addDays(cursor, -1);
  }

  return dates.reverse();
}

function buildScheduleBlueprintKey({
  courseCode,
  day,
  time_slot,
  group_name,
  audience_type,
  subgroup_name,
  studentEmail
}) {
  return [
    courseCode || '',
    day || '',
    time_slot || '',
    group_name || '',
    audience_type || 'group',
    subgroup_name || '',
    studentEmail || ''
  ].join('|');
}

function getStudentsForAudience(usersByEmail, audience = {}) {
  return [...usersByEmail.values()]
    .filter((user) => {
      if (user.role !== 'student') {
        return false;
      }

      if (audience.studentEmail && user.email !== audience.studentEmail) {
        return false;
      }

      if (audience.group_name && user.group_name !== audience.group_name) {
        return false;
      }

      if (audience.subgroup_name && user.subgroup_name !== audience.subgroup_name) {
        return false;
      }

      if (audience.courseCode) {
        const enrolledCourseCodes = ENROLLMENTS[user.email] || [];
        if (!enrolledCourseCodes.includes(audience.courseCode)) {
          return false;
        }
      }

      return true;
    })
    .sort((left, right) => String(left.student_id || '').localeCompare(String(right.student_id || '')));
}

function pickAttendanceStatus(studentId, occurrenceIndex) {
  const pattern = ATTENDANCE_STUDENT_PATTERNS[studentId] || FALLBACK_ATTENDANCE_PATTERN;
  return pattern[occurrenceIndex % pattern.length] || 'present';
}

function buildGradeAuditHistory(entry) {
  if (!Number.isFinite(entry.initialGrade)) {
    return [
      {
        action: 'created',
        previous_grade: null,
        new_grade: entry.grade,
        previous_comments: null,
        new_comments: entry.comments || null
      }
    ];
  }

  return [
    {
      action: 'created',
      previous_grade: null,
      new_grade: entry.initialGrade,
      previous_comments: null,
      new_comments: entry.initialComments || null
    },
    {
      action: 'updated',
      previous_grade: entry.initialGrade,
      new_grade: entry.grade,
      previous_comments: entry.initialComments || null,
      new_comments: entry.comments || null
    }
  ];
}

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
    return null;
  }

  return password;
}

function isRequiredSeedAccount(account) {
  return account.password_env === 'SUPERADMIN_BOOTSTRAP_PASSWORD';
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
      'phone = ?',
      'avatar = ?',
      'date_of_birth = ?',
      'faculty = ?',
      'major = ?',
      'year_of_study = ?',
      'address = ?',
      'father_name = ?',
      'program_class = ?',
      'advisor = ?',
      'study_status = ?',
      'grant_type = ?',
      'registration_date = ?',
      'is_active = ?'
    ];
    const values = [
      user.student_id || null,
      user.name,
      user.role,
      user.group_name || null,
      user.subgroup_name || null,
      user.phone || null,
      user.avatar || null,
      user.date_of_birth || null,
      user.faculty || null,
      user.major || null,
      user.year_of_study || null,
      user.address || null,
      user.father_name || null,
      user.program_class || null,
      user.advisor || null,
      user.study_status || null,
      user.grant_type || null,
      user.registration_date || null,
      ACTIVE_STATUS
    ];

    if (hashedPassword) {
      fields.push('password = ?');
      values.push(hashedPassword);
    }

    if (user.is_superadmin) {
      fields.push('is_superadmin = 1');
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');

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
      student_id, email, password, name, role, group_name, subgroup_name, phone, avatar,
      date_of_birth, faculty, major, year_of_study, address, father_name, program_class,
      advisor, study_status, grant_type, registration_date, is_superadmin
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      user.student_id || null,
      user.email,
      hashedPassword,
      user.name,
      user.role,
      user.group_name || null,
      user.subgroup_name || null,
      user.phone || null,
      user.avatar || null,
      user.date_of_birth || null,
      user.faculty || null,
      user.major || null,
      user.year_of_study || null,
      user.address || null,
      user.father_name || null,
      user.program_class || null,
      user.advisor || null,
      user.study_status || null,
      user.grant_type || null,
      user.registration_date || null,
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

async function ensureAssignment(assignment) {
  const existing = await db.get(
    `SELECT id
     FROM assignments
     WHERE COALESCE(course_id, 0) = COALESCE(?, 0)
       AND title = ?`,
    [assignment.course_id || null, assignment.title]
  );

  if (existing) {
    await db.run(
      `UPDATE assignments
       SET description = ?,
           due_date = ?,
           max_grade = ?,
           created_by = ?
       WHERE id = ?`,
      [
        assignment.description || null,
        assignment.due_date,
        assignment.max_grade,
        assignment.created_by || null,
        existing.id
      ]
    );

    return db.get('SELECT * FROM assignments WHERE id = ?', [existing.id]);
  }

  const result = await db.run(
    `INSERT INTO assignments (course_id, title, description, due_date, max_grade, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      assignment.course_id || null,
      assignment.title,
      assignment.description || null,
      assignment.due_date,
      assignment.max_grade,
      assignment.created_by || null
    ]
  );

  return db.get('SELECT * FROM assignments WHERE id = ?', [result.id]);
}

async function ensureExam(exam) {
  const existing = await db.get(
    `SELECT id
     FROM exams
     WHERE COALESCE(course_id, 0) = COALESCE(?, 0)
       AND group_name = ?
       AND subject = ?
       AND type = ?
       AND exam_date = ?`,
    [
      exam.course_id || null,
      exam.group_name,
      exam.subject,
      exam.type || 'Exam',
      exam.exam_date
    ]
  );

  if (existing) {
    await db.run(
      `UPDATE exams
       SET exam_time = ?,
           room = ?,
           teacher_name = ?,
           semester = ?,
           max_grade = ?,
           created_by = ?
       WHERE id = ?`,
      [
        exam.exam_time,
        exam.room || null,
        exam.teacher_name || null,
        exam.semester || null,
        exam.max_grade || 100,
        exam.created_by || null,
        existing.id
      ]
    );

    return db.get('SELECT * FROM exams WHERE id = ?', [existing.id]);
  }

  const result = await db.run(
    `INSERT INTO exams (
      course_id, group_name, subject, exam_date, exam_time, room, teacher_name, type, semester, max_grade, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      exam.course_id || null,
      exam.group_name,
      exam.subject,
      exam.exam_date,
      exam.exam_time,
      exam.room || null,
      exam.teacher_name || null,
      exam.type || 'Exam',
      exam.semester || null,
      exam.max_grade || 100,
      exam.created_by || null
    ]
  );

  return db.get('SELECT * FROM exams WHERE id = ?', [result.id]);
}

async function syncExamStudents(examId, studentIds) {
  const normalizedIds = [...new Set(studentIds.filter(Boolean).map((studentId) => String(studentId).trim()))];

  await db.run('DELETE FROM exam_students WHERE exam_id = ?', [examId]);

  for (const studentId of normalizedIds) {
    await db.run(
      'INSERT INTO exam_students (exam_id, student_id) VALUES (?, ?)',
      [examId, studentId]
    );
  }
}

async function ensureGradeRecord(grade) {
  const existing = await db.get(
    'SELECT id FROM grades WHERE exam_id = ? AND student_id = ?',
    [grade.exam_id, grade.student_id]
  );

  if (existing) {
    await db.run(
      `UPDATE grades
       SET grade = ?,
           graded_by = ?,
           graded_at = ?,
           comments = ?
       WHERE id = ?`,
      [
        grade.grade,
        grade.graded_by || null,
        grade.graded_at,
        grade.comments || null,
        existing.id
      ]
    );

    return db.get('SELECT * FROM grades WHERE id = ?', [existing.id]);
  }

  const result = await db.run(
    `INSERT INTO grades (exam_id, student_id, grade, graded_by, graded_at, comments)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      grade.exam_id,
      grade.student_id,
      grade.grade,
      grade.graded_by || null,
      grade.graded_at,
      grade.comments || null
    ]
  );

  return db.get('SELECT * FROM grades WHERE id = ?', [result.id]);
}

async function ensureGradeAuditEntry(entry) {
  const existing = await db.get(
    `SELECT id
     FROM grade_audit_log
     WHERE exam_id = ?
       AND student_id = ?
       AND action = ?
       AND changed_at = ?`,
    [entry.exam_id, entry.student_id, entry.action, entry.changed_at]
  );

  if (existing) {
    await db.run(
      `UPDATE grade_audit_log
       SET grade_id = ?,
           previous_grade = ?,
           new_grade = ?,
           previous_comments = ?,
           new_comments = ?,
           changed_by = ?
       WHERE id = ?`,
      [
        entry.grade_id || null,
        entry.previous_grade,
        entry.new_grade,
        entry.previous_comments || null,
        entry.new_comments || null,
        entry.changed_by || null,
        existing.id
      ]
    );

    return;
  }

  await db.run(
    `INSERT INTO grade_audit_log (
      grade_id, exam_id, student_id, action, previous_grade, new_grade,
      previous_comments, new_comments, changed_by, changed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.grade_id || null,
      entry.exam_id,
      entry.student_id,
      entry.action,
      entry.previous_grade,
      entry.new_grade,
      entry.previous_comments || null,
      entry.new_comments || null,
      entry.changed_by || null,
      entry.changed_at
    ]
  );
}

async function ensureAttendanceRecord(entry) {
  const existing = await db.get(
    `SELECT id
     FROM attendance
     WHERE schedule_id = ?
       AND student_id = ?
       AND date = ?`,
    [entry.schedule_id, entry.student_id, entry.date]
  );

  if (existing) {
    await db.run(
      `UPDATE attendance
       SET status = ?,
           marked_by = ?,
           marked_at = ?
       WHERE id = ?`,
      [
        entry.status,
        entry.marked_by || null,
        entry.marked_at,
        existing.id
      ]
    );

    return db.get('SELECT * FROM attendance WHERE id = ?', [existing.id]);
  }

  const result = await db.run(
    `INSERT INTO attendance (schedule_id, student_id, date, status, marked_by, marked_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      entry.schedule_id,
      entry.student_id,
      entry.date,
      entry.status,
      entry.marked_by || null,
      entry.marked_at,
    ]
  );

  return db.get('SELECT * FROM attendance WHERE id = ?', [result.id]);
}

async function ensureAttendanceAuditEntry(entry) {
  const existing = await db.get(
    `SELECT id
     FROM attendance_audit_log
     WHERE schedule_id = ?
       AND student_id = ?
       AND date = ?
       AND action = ?
       AND changed_at = ?`,
    [
      entry.schedule_id,
      entry.student_id,
      entry.date,
      entry.action,
      entry.changed_at
    ]
  );

  if (existing) {
    await db.run(
      `UPDATE attendance_audit_log
       SET attendance_id = ?,
           previous_status = ?,
           new_status = ?,
           changed_by = ?
       WHERE id = ?`,
      [
        entry.attendance_id || null,
        entry.previous_status || null,
        entry.new_status,
        entry.changed_by || null,
        existing.id
      ]
    );

    return;
  }

  await db.run(
    `INSERT INTO attendance_audit_log (
      attendance_id, schedule_id, student_id, date, action, previous_status, new_status, changed_by, changed_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.attendance_id || null,
      entry.schedule_id,
      entry.student_id,
      entry.date,
      entry.action,
      entry.previous_status || null,
      entry.new_status,
      entry.changed_by || null,
      entry.changed_at
    ]
  );
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
    return db.get('SELECT * FROM schedule WHERE id = ?', [existing.id]);
  }

  const result = await db.run(
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

  return db.get('SELECT * FROM schedule WHERE id = ?', [result.id]);
}

async function seedUsers() {
  const salt = await bcrypt.genSalt(10);
  const usersByEmail = new Map();

  for (const account of ACCOUNTS) {
    const existing = await findUserByEmail(account.email);
    const seedPassword = getSeedPassword(account);
    const isRequired = isRequiredSeedAccount(account);

    if (!seedPassword && !existing) {
      if (isRequired) {
        throw new Error(
          `Missing required environment variable ${account.password_env} for seeded account ${account.email}.`
        );
      }

      continue;
    }

    const hashedPassword = seedPassword
      ? await bcrypt.hash(seedPassword, salt)
      : existing?.password || null;
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
  const scheduleByBlueprintKey = new Map();

  for (const blueprint of SCHEDULE_BLUEPRINTS) {
    const course = coursesByCode.get(blueprint.courseCode);
    if (!course) {
      continue;
    }

    const courseBlueprint = COURSE_BLUEPRINTS_BY_CODE.get(blueprint.courseCode);
    const teacher = ACCOUNTS.find((account) => account.email === courseBlueprint?.teacherEmail);
    const student = blueprint.studentEmail ? usersByEmail.get(blueprint.studentEmail) : null;

    for (const slot of blueprint.slots) {
      const savedEntry = await ensureScheduleEntry({
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

      scheduleByBlueprintKey.set(
        buildScheduleBlueprintKey({
          courseCode: blueprint.courseCode,
          day: blueprint.day,
          time_slot: slot,
          group_name: blueprint.group_name || student?.group_name || 'INDIVIDUAL',
          audience_type: blueprint.audience_type || 'group',
          subgroup_name: blueprint.audience_type === 'subgroup' ? blueprint.subgroup_name : null,
          studentEmail: blueprint.audience_type === 'individual' ? blueprint.studentEmail || '' : ''
        }),
        savedEntry
      );
    }
  }

  return scheduleByBlueprintKey;
}

async function seedAssignments(usersByEmail, coursesByCode) {
  const assignmentsByTitle = new Map();

  for (const blueprint of ASSIGNMENT_BLUEPRINTS) {
    const course = coursesByCode.get(blueprint.courseCode);
    if (!course) {
      continue;
    }

    const courseBlueprint = COURSE_BLUEPRINTS_BY_CODE.get(blueprint.courseCode);
    const teacher = courseBlueprint?.teacherEmail
      ? usersByEmail.get(courseBlueprint.teacherEmail)
      : null;

    const assignment = await ensureAssignment({
      course_id: course.id,
      title: blueprint.title,
      description: blueprint.description,
      due_date: toIsoAtTime(addDays(new Date(), blueprint.dueOffsetDays), blueprint.dueTime),
      max_grade: blueprint.maxGrade,
      created_by: teacher?.id || null
    });

    assignmentsByTitle.set(assignment.title, assignment);
  }

  return assignmentsByTitle;
}

async function seedExams(usersByEmail, coursesByCode) {
  const examsByKey = new Map();

  for (const blueprint of EXAM_BLUEPRINTS) {
    const course = coursesByCode.get(blueprint.courseCode);
    if (!course) {
      continue;
    }

    const courseBlueprint = COURSE_BLUEPRINTS_BY_CODE.get(blueprint.courseCode);
    const teacher = courseBlueprint?.teacherEmail
      ? usersByEmail.get(courseBlueprint.teacherEmail)
      : null;
    const students = getStudentsForAudience(usersByEmail, blueprint.audience);

    const exam = await ensureExam({
      course_id: course.id,
      group_name: blueprint.group_name,
      subject: blueprint.subject,
      exam_date: formatDateOnly(addDays(new Date(), blueprint.examOffsetDays)),
      exam_time: blueprint.exam_time,
      room: blueprint.room,
      teacher_name: teacher?.name || courseBlueprint?.teacherEmail || 'Teacher not assigned',
      type: blueprint.type,
      semester: PRESENTATION_SEMESTER,
      max_grade: 100,
      created_by: teacher?.id || null
    });

    await syncExamStudents(
      exam.id,
      students.map((student) => student.student_id).filter(Boolean)
    );

    examsByKey.set(blueprint.key, {
      ...exam,
      students
    });
  }

  return examsByKey;
}

async function seedGrades(usersByEmail, examsByKey) {
  let gradeCount = 0;

  for (const [examKey, gradeEntries] of Object.entries(GRADE_BLUEPRINTS)) {
    const exam = examsByKey.get(examKey);
    if (!exam) {
      continue;
    }

    const gradedBy = [...usersByEmail.values()].find(
      (user) => user.role === 'teacher' && user.name === exam.teacher_name
    );

    for (let index = 0; index < gradeEntries.length; index += 1) {
      const entry = gradeEntries[index];
      const gradedAt = toIsoAtTime(exam.exam_date, `${String(10 + (index % 5)).padStart(2, '0')}:15`);
      const gradeRecord = await ensureGradeRecord({
        exam_id: exam.id,
        student_id: entry.studentId,
        grade: entry.grade,
        graded_by: gradedBy?.id || null,
        graded_at: gradedAt,
        comments: entry.comments || null
      });

      const auditHistory = buildGradeAuditHistory(entry);
      for (let auditIndex = 0; auditIndex < auditHistory.length; auditIndex += 1) {
        const auditEntry = auditHistory[auditIndex];
        await ensureGradeAuditEntry({
          grade_id: gradeRecord.id,
          exam_id: exam.id,
          student_id: entry.studentId,
          action: auditEntry.action,
          previous_grade: auditEntry.previous_grade,
          new_grade: auditEntry.new_grade,
          previous_comments: auditEntry.previous_comments,
          new_comments: auditEntry.new_comments,
          changed_by: gradedBy?.id || null,
          changed_at: toIsoAtTime(
            exam.exam_date,
            `${String(9 + auditIndex).padStart(2, '0')}:${String(10 + index).padStart(2, '0')}`
          )
        });
      }

      gradeCount += 1;
    }
  }

  return gradeCount;
}

async function seedAttendance(usersByEmail, scheduleByBlueprintKey) {
  let attendanceCount = 0;

  for (const scenario of ATTENDANCE_SCENARIOS) {
    const schedule = scheduleByBlueprintKey.get(
      buildScheduleBlueprintKey(scenario.schedule)
    );
    if (!schedule) {
      continue;
    }

    const roster = getStudentsForAudience(usersByEmail, {
      group_name: scenario.schedule.group_name === 'INDIVIDUAL'
        ? null
        : scenario.schedule.group_name,
      subgroup_name: scenario.schedule.subgroup_name || null,
      studentEmail: scenario.schedule.studentEmail || null,
      courseCode: scenario.schedule.courseCode
    });

    const courseBlueprint = COURSE_BLUEPRINTS_BY_CODE.get(scenario.schedule.courseCode);
    const teacher = courseBlueprint?.teacherEmail
      ? usersByEmail.get(courseBlueprint.teacherEmail)
      : null;
    const dates = getRecentWeekdayDates(scenario.schedule.day, scenario.recentOccurrences);

    for (let occurrenceIndex = 0; occurrenceIndex < dates.length; occurrenceIndex += 1) {
      const date = dates[occurrenceIndex];

      for (const student of roster) {
        const status = pickAttendanceStatus(student.student_id, occurrenceIndex);
        const markedAt = toIsoAtTime(date, '08:10');
        const attendanceRecord = await ensureAttendanceRecord({
          schedule_id: schedule.id,
          student_id: student.student_id,
          date,
          status,
          marked_by: teacher?.id || null,
          marked_at: markedAt
        });

        const createdAuditAt = toIsoAtTime(date, '08:12');
        await ensureAttendanceAuditEntry({
          attendance_id: attendanceRecord.id,
          schedule_id: schedule.id,
          student_id: student.student_id,
          date,
          action: 'created',
          previous_status: null,
          new_status: status,
          changed_by: teacher?.id || null,
          changed_at: createdAuditAt
        });

        const shouldShowUpdate = (
          (student.student_id === '240141058' && occurrenceIndex === 0 && status !== 'present')
          || (student.student_id === '240141063' && occurrenceIndex === 1)
        );

        if (shouldShowUpdate) {
          await ensureAttendanceAuditEntry({
            attendance_id: attendanceRecord.id,
            schedule_id: schedule.id,
            student_id: student.student_id,
            date,
            action: 'updated',
            previous_status: 'present',
            new_status: status,
            changed_by: teacher?.id || null,
            changed_at: toIsoAtTime(date, '08:18')
          });
        }

        attendanceCount += 1;
      }
    }
  }

  return attendanceCount;
}


module.exports = {
  seedAssignments,
  seedAttendance,
  seedCourses,
  seedEnrollments,
  seedExams,
  seedGrades,
  seedSchedule,
  seedUsers
};
