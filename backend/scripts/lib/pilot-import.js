const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');

const db = require('../../config/database');

const IMPORT_ROOT = path.join(__dirname, '..', '..', 'imports');
const INBOX_DIR = path.join(IMPORT_ROOT, 'inbox');
const REPORTS_DIR = path.join(IMPORT_ROOT, 'reports');
const ACTIVE_STATUS = db.client === 'postgres' ? true : 1;
const SUPPORTED_IMPORT_EXTENSIONS = ['.xlsx', '.xls', '.csv', '.tsv'];

const ENTITY_CONFIG = {
  students: {
    label: 'Students',
    role: 'student',
    filenameBase: 'students',
    required: ['student_id', 'name', 'email', 'group_name'],
    aliases: {
      student_id: ['student_id', 'studentid', 'student_id_number', 'student_number', 'student_no', 'id_number'],
      name: ['name', 'full_name', 'fullname', 'student_name'],
      email: ['email', 'student_email', 'university_email', 'mail'],
      group_name: ['group_name', 'group', 'group_code', 'cohort_group'],
      subgroup_name: ['subgroup_name', 'subgroup', 'sub_group', 'section'],
      faculty: ['faculty', 'school'],
      major: ['major', 'program', 'specialization'],
      year_of_study: ['year_of_study', 'year', 'study_year', 'course_year'],
      phone: ['phone', 'phone_number', 'mobile'],
      advisor: ['advisor', 'curator'],
      study_status: ['study_status', 'status', 'academic_status'],
      grant_type: ['grant_type', 'scholarship_type', 'tuition_type'],
      program_class: ['program_class', 'program_code', 'class_code'],
      registration_date: ['registration_date', 'admission_date', 'registered_at'],
      date_of_birth: ['date_of_birth', 'birth_date', 'dob'],
      address: ['address', 'home_address'],
      father_name: ['father_name', 'guardian_name']
    }
  },
  teachers: {
    label: 'Teachers',
    role: 'teacher',
    filenameBase: 'teachers',
    required: ['name', 'email'],
    aliases: {
      name: ['name', 'full_name', 'fullname', 'teacher_name'],
      email: ['email', 'teacher_email', 'university_email', 'mail'],
      faculty: ['faculty', 'school'],
      major: ['major', 'department', 'specialization'],
      phone: ['phone', 'phone_number', 'mobile'],
      advisor: ['advisor'],
      address: ['address', 'office', 'office_location']
    }
  },
  courses: {
    label: 'Courses',
    filenameBase: 'courses',
    required: ['code', 'name'],
    aliases: {
      code: ['code', 'course_code', 'subject_code'],
      name: ['name', 'course_name', 'subject_name'],
      description: ['description', 'summary'],
      credits: ['credits', 'credit', 'ects'],
      semester: ['semester', 'term'],
      teacher_email: ['teacher_email', 'teacher_mail', 'assigned_teacher_email', 'lecturer_email']
    }
  },
  enrollments: {
    label: 'Enrollments',
    filenameBase: 'enrollments',
    required: ['course_code'],
    aliases: {
      student_id: ['student_id', 'studentid', 'student_number'],
      student_email: ['student_email', 'email', 'student_mail'],
      course_code: ['course_code', 'code', 'subject_code'],
      enrolled_at: ['enrolled_at', 'enrollment_date', 'date']
    }
  },
  schedule: {
    label: 'Schedule',
    filenameBase: 'schedule',
    required: ['course_code', 'day', 'time_slot'],
    aliases: {
      course_code: ['course_code', 'code', 'subject_code'],
      day: ['day', 'weekday'],
      time_slot: ['time_slot', 'slot', 'time'],
      group_name: ['group_name', 'group', 'group_code'],
      audience_type: ['audience_type', 'audience', 'type'],
      subgroup_name: ['subgroup_name', 'subgroup', 'section'],
      student_id: ['student_id', 'studentid', 'student_number'],
      student_email: ['student_email', 'email', 'student_mail'],
      room: ['room', 'classroom', 'auditorium'],
      subject: ['subject', 'subject_name', 'course_name'],
      teacher: ['teacher', 'teacher_name', 'lecturer_name']
    }
  }
};

Object.values(ENTITY_CONFIG).forEach((config) => {
  config.aliasLookup = new Map();
  Object.entries(config.aliases).forEach(([field, aliases]) => {
    aliases.forEach((alias) => {
      config.aliasLookup.set(alias, field);
    });
  });
});

const USER_IMPORT_FIELDS = [
  'student_id',
  'email',
  'name',
  'role',
  'group_name',
  'subgroup_name',
  'phone',
  'avatar',
  'date_of_birth',
  'faculty',
  'major',
  'year_of_study',
  'address',
  'father_name',
  'program_class',
  'advisor',
  'study_status',
  'grant_type',
  'registration_date',
  'is_active'
];

const COURSE_IMPORT_FIELDS = [
  'code',
  'name',
  'description',
  'credits',
  'semester',
  'teacher_id'
];

const ENROLLMENT_IMPORT_FIELDS = [
  'student_id',
  'course_id'
];

const SCHEDULE_IMPORT_FIELDS = [
  'day',
  'time_slot',
  'group_name',
  'audience_type',
  'subgroup_name',
  'student_user_id',
  'subject',
  'teacher',
  'room',
  'course_id'
];

const ensureDirectory = (directoryPath) => {
  fs.mkdirSync(directoryPath, { recursive: true });
};

const formatDateParts = (value) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateTimeParts = (value) => (
  `${formatDateParts(value)} ${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}:${String(value.getSeconds()).padStart(2, '0')}`
);

const sanitizeCell = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const datePart = formatDateParts(value);
    const hours = value.getHours();
    const minutes = value.getMinutes();
    const seconds = value.getSeconds();

    if (!hours && !minutes && !seconds) {
      return datePart;
    }

    return `${datePart} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  return String(value).trim();
};

const normalizeHeaderKey = (value) => (
  sanitizeCell(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
);

const normalizeEmail = (value) => sanitizeCell(value).toLowerCase();
const normalizeCourseCode = (value) => sanitizeCell(value).toUpperCase();

const AUDIENCE_TYPES = new Set(['group', 'subgroup', 'individual']);
const DAY_NAME_MAP = new Map([
  ['monday', 'Monday'],
  ['tuesday', 'Tuesday'],
  ['wednesday', 'Wednesday'],
  ['thursday', 'Thursday'],
  ['friday', 'Friday'],
  ['saturday', 'Saturday'],
  ['sunday', 'Sunday']
]);

const parsePositiveInteger = (value) => {
  const cleaned = sanitizeCell(value);
  if (!cleaned) {
    return null;
  }

  const parsed = Number(cleaned);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
};

const normalizeDate = (value) => {
  const cleaned = sanitizeCell(value);
  if (!cleaned) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  const parsed = new Date(cleaned);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return formatDateParts(parsed);
};

const normalizeTimestamp = (value) => {
  const cleaned = sanitizeCell(value);
  if (!cleaned) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
    return cleaned;
  }

  const normalized = cleaned.replace('T', ' ');
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(normalized)) {
    return normalized;
  }

  const parsed = new Date(cleaned);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return formatDateTimeParts(parsed);
};

const normalizeAudienceType = (value) => {
  const cleaned = sanitizeCell(value).toLowerCase() || 'group';
  return AUDIENCE_TYPES.has(cleaned) ? cleaned : 'group';
};

const normalizeDay = (value) => {
  const cleaned = sanitizeCell(value);
  if (!cleaned) {
    return '';
  }

  const mapped = DAY_NAME_MAP.get(cleaned.toLowerCase());
  return mapped || cleaned;
};

const buildAvatar = (name) => {
  const initials = sanitizeCell(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  return initials || 'CU';
};

const readTabularFile = (filePath, sheetName) => {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  const targetSheetName = sheetName || workbook.SheetNames[0];
  const worksheet = workbook.Sheets[targetSheetName];

  if (!worksheet) {
    throw new Error(`Sheet "${targetSheetName}" was not found in ${path.basename(filePath)}.`);
  }

  return XLSX.utils.sheet_to_json(worksheet, {
    defval: '',
    raw: false,
    blankrows: false
  });
};

const pickCanonicalRecord = (entityKey, rawRow) => {
  const config = ENTITY_CONFIG[entityKey];
  const canonical = {};
  const unknownColumns = [];

  Object.entries(rawRow).forEach(([rawHeader, rawValue]) => {
    const normalizedHeader = normalizeHeaderKey(rawHeader);
    const value = sanitizeCell(rawValue);

    if (!normalizedHeader || !value) {
      return;
    }

    const field = config.aliasLookup.get(normalizedHeader);
    if (!field) {
      unknownColumns.push(rawHeader);
      return;
    }

    if (!canonical[field]) {
      canonical[field] = value;
    }
  });

  return {
    canonical,
    unknownColumns: [...new Set(unknownColumns)]
  };
};

const normalizeStudentRecord = (record) => ({
  student_id: sanitizeCell(record.student_id),
  name: sanitizeCell(record.name),
  email: normalizeEmail(record.email),
  role: 'student',
  group_name: sanitizeCell(record.group_name),
  subgroup_name: sanitizeCell(record.subgroup_name) || null,
  faculty: sanitizeCell(record.faculty) || null,
  major: sanitizeCell(record.major) || null,
  year_of_study: parsePositiveInteger(record.year_of_study),
  phone: sanitizeCell(record.phone) || null,
  advisor: sanitizeCell(record.advisor) || null,
  study_status: sanitizeCell(record.study_status) || null,
  grant_type: sanitizeCell(record.grant_type) || null,
  program_class: sanitizeCell(record.program_class) || null,
  registration_date: normalizeDate(record.registration_date),
  date_of_birth: normalizeDate(record.date_of_birth),
  address: sanitizeCell(record.address) || null,
  father_name: sanitizeCell(record.father_name) || null,
  avatar: buildAvatar(record.name),
  is_active: ACTIVE_STATUS
});

const normalizeTeacherRecord = (record) => ({
  name: sanitizeCell(record.name),
  email: normalizeEmail(record.email),
  role: 'teacher',
  faculty: sanitizeCell(record.faculty) || null,
  major: sanitizeCell(record.major) || null,
  phone: sanitizeCell(record.phone) || null,
  advisor: sanitizeCell(record.advisor) || null,
  address: sanitizeCell(record.address) || null,
  avatar: buildAvatar(record.name),
  is_active: ACTIVE_STATUS
});

const normalizeCourseRecord = (record) => ({
  code: normalizeCourseCode(record.code),
  name: sanitizeCell(record.name),
  description: sanitizeCell(record.description) || null,
  credits: parsePositiveInteger(record.credits),
  semester: sanitizeCell(record.semester) || null,
  teacher_email: normalizeEmail(record.teacher_email) || null
});

const normalizeEnrollmentRecord = (record) => ({
  student_id: sanitizeCell(record.student_id),
  student_email: normalizeEmail(record.student_email) || null,
  course_code: normalizeCourseCode(record.course_code),
  enrolled_at: normalizeTimestamp(record.enrolled_at)
});

const normalizeScheduleRecord = (record) => ({
  course_code: normalizeCourseCode(record.course_code),
  day: normalizeDay(record.day),
  time_slot: sanitizeCell(record.time_slot),
  group_name: sanitizeCell(record.group_name) || null,
  audience_type: normalizeAudienceType(record.audience_type),
  subgroup_name: sanitizeCell(record.subgroup_name) || null,
  student_id: sanitizeCell(record.student_id),
  student_email: normalizeEmail(record.student_email) || null,
  room: sanitizeCell(record.room) || null,
  subject: sanitizeCell(record.subject) || null,
  teacher: sanitizeCell(record.teacher) || null
});

const validateRecord = (entityKey, record, rowNumber) => {
  const config = ENTITY_CONFIG[entityKey];
  const errors = [];
  const warnings = [];

  config.required.forEach((field) => {
    if (!record[field]) {
      errors.push(`${config.label.slice(0, -1)} row ${rowNumber}: missing required field "${field}".`);
    }
  });

  if (record.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email)) {
    errors.push(`${config.label.slice(0, -1)} row ${rowNumber}: invalid email "${record.email}".`);
  }

  if (record.student_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.student_email)) {
    errors.push(`${config.label.slice(0, -1)} row ${rowNumber}: invalid student_email "${record.student_email}".`);
  }

  if (record.teacher_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.teacher_email)) {
    errors.push(`${config.label.slice(0, -1)} row ${rowNumber}: invalid teacher_email "${record.teacher_email}".`);
  }

  if (entityKey === 'students') {
    if (record.year_of_study === null && sanitizeCell(record.year_of_study) !== '') {
      errors.push(`Student row ${rowNumber}: year_of_study must be a positive integer.`);
    }

    if (sanitizeCell(record.registration_date) && !record.registration_date) {
      errors.push(`Student row ${rowNumber}: registration_date must be a valid date.`);
    }

    if (sanitizeCell(record.date_of_birth) && !record.date_of_birth) {
      errors.push(`Student row ${rowNumber}: date_of_birth must be a valid date.`);
    }
  }

  if (entityKey === 'courses' && sanitizeCell(record.credits) && record.credits === null) {
    errors.push(`Course row ${rowNumber}: credits must be a positive integer.`);
  }

  if (entityKey === 'enrollments') {
    if (!record.student_id && !record.student_email) {
      errors.push(`Enrollment row ${rowNumber}: student_id or student_email is required.`);
    }

    if (sanitizeCell(record.enrolled_at) && !record.enrolled_at) {
      errors.push(`Enrollment row ${rowNumber}: enrolled_at must be a valid date or datetime.`);
    }
  }

  if (entityKey === 'schedule') {
    if (!record.group_name && record.audience_type !== 'individual') {
      errors.push(`Schedule row ${rowNumber}: group_name is required for group and subgroup entries.`);
    }

    if (record.audience_type === 'subgroup' && !record.subgroup_name) {
      errors.push(`Schedule row ${rowNumber}: subgroup_name is required for subgroup entries.`);
    }

    if (record.audience_type === 'individual' && !record.student_id && !record.student_email) {
      errors.push(`Schedule row ${rowNumber}: student_id or student_email is required for individual entries.`);
    }
  }

  return { errors, warnings };
};

const findExistingUser = async (entityKey, record) => {
  const candidates = [];

  if (entityKey === 'students' && record.student_id) {
    const byStudentId = await db.get('SELECT * FROM users WHERE student_id = ?', [record.student_id]);
    if (byStudentId) {
      candidates.push(byStudentId);
    }
  }

  if (record.email) {
    const byEmail = await db.get('SELECT * FROM users WHERE email = ?', [record.email]);
    if (byEmail) {
      candidates.push(byEmail);
    }
  }

  const uniqueCandidates = candidates.filter(
    (candidate, index, array) => array.findIndex((item) => item.id === candidate.id) === index
  );

  if (uniqueCandidates.length > 1) {
    return {
      error: `Conflicting existing records found for ${record.email || record.student_id}.`
    };
  }

  const existing = uniqueCandidates[0] || null;
  if (existing && existing.role !== ENTITY_CONFIG[entityKey].role) {
    return {
      error: `Existing user ${existing.email} has role "${existing.role}", expected "${ENTITY_CONFIG[entityKey].role}".`
    };
  }

  return { existing };
};

const findExistingCourse = async (record) => {
  const existing = await db.get('SELECT * FROM courses WHERE code = ?', [record.code]);
  return { existing };
};

const findCourseContextByCode = async (courseCode) => (
  db.get(
    `SELECT
       c.*,
       u.name AS teacher_name,
       u.email AS teacher_email
     FROM courses c
     LEFT JOIN users u ON u.id = c.teacher_id
     WHERE c.code = ?`,
    [courseCode]
  )
);

const findTeacherByEmail = async (teacherEmail) => (
  db.get(
    'SELECT id, name, email, role FROM users WHERE email = ?',
    [teacherEmail]
  )
);

const findStudentByReference = async ({ studentId, studentEmail }) => {
  const candidates = [];

  if (studentId) {
    const byStudentId = await db.get(
      'SELECT id, role, student_id, email, name, group_name, subgroup_name FROM users WHERE student_id = ?',
      [studentId]
    );
    if (byStudentId) {
      candidates.push(byStudentId);
    }
  }

  if (studentEmail) {
    const byEmail = await db.get(
      'SELECT id, role, student_id, email, name, group_name, subgroup_name FROM users WHERE email = ?',
      [studentEmail]
    );
    if (byEmail) {
      candidates.push(byEmail);
    }
  }

  const uniqueCandidates = candidates.filter(
    (candidate, index, array) => array.findIndex((item) => item.id === candidate.id) === index
  );

  if (!uniqueCandidates.length) {
    return { student: null };
  }

  if (uniqueCandidates.length > 1) {
    return {
      error: `Student reference ${studentId || studentEmail} matches multiple existing users.`
    };
  }

  const student = uniqueCandidates[0];
  if (student.role !== 'student') {
    return {
      error: `User ${student.email} exists but is not a student.`
    };
  }

  return { student };
};

const getComparableUserRecord = (record) => {
  const comparable = {};
  USER_IMPORT_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(record, field)) {
      comparable[field] = record[field];
    }
  });

  return comparable;
};

const getComparableCourseRecord = (record) => {
  const comparable = {};
  COURSE_IMPORT_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(record, field)) {
      comparable[field] = record[field];
    }
  });

  return comparable;
};

const getComparableEnrollmentRecord = (record) => {
  const comparable = {};
  ENROLLMENT_IMPORT_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(record, field)) {
      comparable[field] = record[field];
    }
  });

  if (record.enrolled_at) {
    comparable.enrolled_at = record.enrolled_at;
  }

  return comparable;
};

const getComparableScheduleRecord = (record) => {
  const comparable = {};
  SCHEDULE_IMPORT_FIELDS.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(record, field)) {
      comparable[field] = record[field];
    }
  });

  return comparable;
};

const hasChanges = (existing, comparable) => (
  Object.entries(comparable).some(([field, value]) => {
    const existingValue = existing[field] === undefined ? null : existing[field];
    return String(existingValue ?? '') !== String(value ?? '');
  })
);

const buildSummaryBucket = (label) => ({
  label,
  rows: 0,
  valid: 0,
  warnings: 0,
  errors: 0,
  create: 0,
  update: 0,
  skip: 0
});

const createIssue = (severity, entityKey, rowNumber, message) => ({
  severity,
  entity: entityKey,
  rowNumber,
  message
});

const getPreviewLookupIndex = (items, keys) => {
  const index = new Map();
  items.forEach((item) => {
    keys.forEach((key) => {
      const value = item.record[key];
      if (value) {
        index.set(`${key}:${value}`, item);
      }
    });
  });
  return index;
};

const getPreviewItemId = (item) => item?.appliedId || item?.existingId || null;

const resolveTeacherDisplayByEmail = async (teacherEmail, teacherPreviewByEmail) => {
  const normalizedEmail = normalizeEmail(teacherEmail);
  if (!normalizedEmail) {
    return null;
  }

  const previewTeacher = teacherPreviewByEmail.get(normalizedEmail);
  if (previewTeacher?.status === 'ready') {
    return previewTeacher.record.name || normalizedEmail;
  }

  const teacher = await findTeacherByEmail(normalizedEmail);
  return teacher?.name || teacher?.email || normalizedEmail;
};

const resolveTeacherAssignment = async (teacherEmail, teacherPreviewByEmail) => {
  if (!teacherEmail) {
    return { teacherId: null, deferredTeacherEmail: null, warning: null };
  }

  const previewTeacher = teacherPreviewByEmail.get(teacherEmail);
  if (previewTeacher?.status === 'error') {
    return {
      teacherId: null,
      deferredTeacherEmail: null,
      warning: `Teacher ${teacherEmail} is present in the import set but failed validation.`
    };
  }

  if (previewTeacher?.existingId) {
    return { teacherId: previewTeacher.existingId, deferredTeacherEmail: null, warning: null };
  }

  if (previewTeacher?.action === 'create') {
    return { teacherId: null, deferredTeacherEmail: teacherEmail, warning: null };
  }

  const teacher = await db.get(
    'SELECT id, role FROM users WHERE email = ?',
    [teacherEmail]
  );

  if (!teacher) {
    return {
      teacherId: null,
      deferredTeacherEmail: null,
      warning: `Teacher ${teacherEmail} was not found. The course will stay unassigned.`
    };
  }

  if (teacher.role !== 'teacher') {
    return {
      teacherId: null,
      deferredTeacherEmail: null,
      warning: `User ${teacherEmail} exists but is not a teacher. The course will stay unassigned.`
    };
  }

  return { teacherId: teacher.id, deferredTeacherEmail: null, warning: null };
};

const resolveStudentReference = async (record, studentPreviewIndex) => {
  const previewMatches = [];

  if (record.student_id && studentPreviewIndex.has(`student_id:${record.student_id}`)) {
    previewMatches.push(studentPreviewIndex.get(`student_id:${record.student_id}`));
  }

  if (record.student_email && studentPreviewIndex.has(`email:${record.student_email}`)) {
    previewMatches.push(studentPreviewIndex.get(`email:${record.student_email}`));
  }

  const uniquePreviewMatches = previewMatches.filter(
    (candidate, index, array) => array.findIndex((item) => item.rowNumber === candidate.rowNumber) === index
  );

  if (uniquePreviewMatches.length > 1) {
    return {
      error: `Student reference ${record.student_id || record.student_email} matches multiple rows in the import set.`
    };
  }

  const previewStudent = uniquePreviewMatches[0] || null;
  if (previewStudent) {
    if (previewStudent.status === 'error') {
      return {
        error: `Referenced student ${previewStudent.record.email || previewStudent.record.student_id} failed validation in the import set.`
      };
    }

    return {
      studentUserId: previewStudent.existingId || null,
      deferredStudent: previewStudent.action === 'create'
        ? {
            student_id: previewStudent.record.student_id || null,
            student_email: previewStudent.record.email || null
          }
        : null,
      studentRecord: previewStudent.record
    };
  }

  const existingStudent = await findStudentByReference({
    studentId: record.student_id,
    studentEmail: record.student_email
  });

  if (existingStudent.error) {
    return { error: existingStudent.error };
  }

  if (!existingStudent.student) {
    return {
      error: `Student ${record.student_email || record.student_id} was not found.`
    };
  }

  return {
    studentUserId: existingStudent.student.id,
    deferredStudent: null,
    studentRecord: existingStudent.student
  };
};

const resolveCourseReference = async (record, coursePreviewByCode, teacherPreviewByEmail) => {
  const previewCourse = coursePreviewByCode.get(record.course_code);

  if (previewCourse) {
    if (previewCourse.status === 'error') {
      return {
        error: `Referenced course ${record.course_code} failed validation in the import set.`
      };
    }

    return {
      courseId: previewCourse.existingId || null,
      deferredCourseCode: previewCourse.action === 'create' ? previewCourse.record.code : null,
      courseRecord: previewCourse.record,
      teacherName: previewCourse.record.teacher_email
        ? await resolveTeacherDisplayByEmail(previewCourse.record.teacher_email, teacherPreviewByEmail)
        : null
    };
  }

  const course = await findCourseContextByCode(record.course_code);
  if (!course) {
    return {
      error: `Course ${record.course_code} was not found.`
    };
  }

  return {
    courseId: course.id,
    deferredCourseCode: null,
    courseRecord: course,
    teacherName: course.teacher_name || course.teacher_email || null
  };
};

const findExistingEnrollment = async (studentUserId, courseId) => (
  db.get(
    'SELECT * FROM course_enrollments WHERE student_id = ? AND course_id = ?',
    [studentUserId, courseId]
  )
);

const findExistingScheduleEntry = async (record) => (
  db.get(
    `SELECT *
     FROM schedule
     WHERE day = ?
       AND time_slot = ?
       AND COALESCE(group_name, '') = COALESCE(?, '')
       AND COALESCE(audience_type, 'group') = COALESCE(?, 'group')
       AND COALESCE(subgroup_name, '') = COALESCE(?, '')
       AND COALESCE(student_user_id, 0) = COALESCE(?, 0)
       AND COALESCE(course_id, 0) = COALESCE(?, 0)`,
    [
      record.day,
      record.time_slot,
      record.group_name || null,
      record.audience_type || 'group',
      record.subgroup_name || null,
      record.student_user_id || null,
      record.course_id || null
    ]
  )
);

const parseEntityRows = async (entityKey, filePath, sheetName) => {
  const rows = readTabularFile(filePath, sheetName);
  return rows.map((rawRow, index) => {
    const rowNumber = index + 2;
    const { canonical, unknownColumns } = pickCanonicalRecord(entityKey, rawRow);
    const normalized = entityKey === 'students'
      ? normalizeStudentRecord(canonical)
      : entityKey === 'teachers'
        ? normalizeTeacherRecord(canonical)
        : entityKey === 'courses'
          ? normalizeCourseRecord(canonical)
          : entityKey === 'enrollments'
            ? normalizeEnrollmentRecord(canonical)
            : normalizeScheduleRecord(canonical);
    const { errors, warnings } = validateRecord(entityKey, normalized, rowNumber);

    if (unknownColumns.length) {
      warnings.push(
        `${ENTITY_CONFIG[entityKey].label.slice(0, -1)} row ${rowNumber}: ignored columns ${unknownColumns.join(', ')}.`
      );
    }

    return {
      entity: entityKey,
      rowNumber,
      source: path.basename(filePath),
      record: normalized,
      errors,
      warnings
    };
  });
};

const classifyUserRows = async (entityKey, items, summary, issues) => {
  const previews = [];

  for (const item of items) {
    summary.rows += 1;
    summary.errors += item.errors.length;
    summary.warnings += item.warnings.length;
    item.errors.forEach((message) => issues.push(createIssue('error', entityKey, item.rowNumber, message)));
    item.warnings.forEach((message) => issues.push(createIssue('warning', entityKey, item.rowNumber, message)));

    if (item.errors.length) {
      previews.push({
        ...item,
        action: 'error',
        status: 'error',
        existingId: null
      });
      continue;
    }

    const lookup = await findExistingUser(entityKey, item.record);
    if (lookup.error) {
      issues.push(createIssue('error', entityKey, item.rowNumber, lookup.error));
      summary.errors += 1;
      previews.push({
        ...item,
        action: 'error',
        status: 'error',
        existingId: null
      });
      continue;
    }

    const comparable = getComparableUserRecord(item.record);
    const action = lookup.existing
      ? (hasChanges(lookup.existing, comparable) ? 'update' : 'skip')
      : 'create';

    summary.valid += 1;
    summary[action] += 1;

    previews.push({
      ...item,
      action,
      status: 'ready',
      existingId: lookup.existing?.id || null
    });
  }

  return previews;
};

const classifyCourseRows = async (items, summary, issues, teacherPreviewByEmail) => {
  const previews = [];

  for (const item of items) {
    summary.rows += 1;
    summary.errors += item.errors.length;
    summary.warnings += item.warnings.length;
    item.errors.forEach((message) => issues.push(createIssue('error', 'courses', item.rowNumber, message)));
    item.warnings.forEach((message) => issues.push(createIssue('warning', 'courses', item.rowNumber, message)));

    if (item.errors.length) {
      previews.push({
        ...item,
        action: 'error',
        status: 'error',
        existingId: null,
        teacherId: null
      });
      continue;
    }

    const teacherResolution = await resolveTeacherAssignment(item.record.teacher_email, teacherPreviewByEmail);
    if (teacherResolution.warning) {
      issues.push(createIssue('warning', 'courses', item.rowNumber, teacherResolution.warning));
      summary.warnings += 1;
      item.warnings = [...item.warnings, teacherResolution.warning];
    }

    const lookup = await findExistingCourse(item.record);
    const comparable = getComparableCourseRecord({
      ...item.record,
      teacher_id: teacherResolution.teacherId
    });

    const action = lookup.existing
      ? (teacherResolution.deferredTeacherEmail
          ? 'update'
          : (hasChanges(lookup.existing, comparable) ? 'update' : 'skip'))
      : 'create';

    summary.valid += 1;
    summary[action] += 1;

    previews.push({
      ...item,
      action,
      status: 'ready',
      existingId: lookup.existing?.id || null,
      teacherId: teacherResolution.teacherId,
      deferredTeacherEmail: teacherResolution.deferredTeacherEmail
    });
  }

  return previews;
};

const classifyEnrollmentRows = async (items, summary, issues, studentPreviewIndex, coursePreviewByCode, teacherPreviewByEmail) => {
  const previews = [];

  for (const item of items) {
    summary.rows += 1;
    summary.errors += item.errors.length;
    summary.warnings += item.warnings.length;
    item.errors.forEach((message) => issues.push(createIssue('error', 'enrollments', item.rowNumber, message)));
    item.warnings.forEach((message) => issues.push(createIssue('warning', 'enrollments', item.rowNumber, message)));

    if (item.errors.length) {
      previews.push({
        ...item,
        action: 'error',
        status: 'error',
        existingId: null
      });
      continue;
    }

    const studentResolution = await resolveStudentReference(item.record, studentPreviewIndex);
    if (studentResolution.error) {
      issues.push(createIssue('error', 'enrollments', item.rowNumber, studentResolution.error));
      summary.errors += 1;
      previews.push({
        ...item,
        action: 'error',
        status: 'error',
        existingId: null
      });
      continue;
    }

    const courseResolution = await resolveCourseReference(item.record, coursePreviewByCode, teacherPreviewByEmail);
    if (courseResolution.error) {
      issues.push(createIssue('error', 'enrollments', item.rowNumber, courseResolution.error));
      summary.errors += 1;
      previews.push({
        ...item,
        action: 'error',
        status: 'error',
        existingId: null
      });
      continue;
    }

    let existing = null;
    let action = 'create';

    if (!studentResolution.deferredStudent && !courseResolution.deferredCourseCode) {
      existing = await findExistingEnrollment(studentResolution.studentUserId, courseResolution.courseId);
      if (existing) {
        const comparable = getComparableEnrollmentRecord({
          student_id: studentResolution.studentUserId,
          course_id: courseResolution.courseId,
          enrolled_at: item.record.enrolled_at
        });
        action = hasChanges(existing, comparable) ? 'update' : 'skip';
      }
    }

    summary.valid += 1;
    summary[action] += 1;

    previews.push({
      ...item,
      action,
      status: 'ready',
      existingId: existing?.id || null,
      resolvedStudentUserId: studentResolution.studentUserId,
      resolvedCourseId: courseResolution.courseId,
      deferredStudent: studentResolution.deferredStudent,
      deferredCourseCode: courseResolution.deferredCourseCode,
      preparedRecord: {
        student_id: studentResolution.studentUserId,
        course_id: courseResolution.courseId,
        enrolled_at: item.record.enrolled_at || null
      }
    });
  }

  return previews;
};

const classifyScheduleRows = async (items, summary, issues, studentPreviewIndex, coursePreviewByCode, teacherPreviewByEmail) => {
  const previews = [];

  for (const item of items) {
    summary.rows += 1;
    summary.errors += item.errors.length;
    summary.warnings += item.warnings.length;
    item.errors.forEach((message) => issues.push(createIssue('error', 'schedule', item.rowNumber, message)));
    item.warnings.forEach((message) => issues.push(createIssue('warning', 'schedule', item.rowNumber, message)));

    if (item.errors.length) {
      previews.push({
        ...item,
        action: 'error',
        status: 'error',
        existingId: null
      });
      continue;
    }

    const courseResolution = await resolveCourseReference(item.record, coursePreviewByCode, teacherPreviewByEmail);
    if (courseResolution.error) {
      issues.push(createIssue('error', 'schedule', item.rowNumber, courseResolution.error));
      summary.errors += 1;
      previews.push({
        ...item,
        action: 'error',
        status: 'error',
        existingId: null
      });
      continue;
    }

    let studentResolution = {
      studentUserId: null,
      deferredStudent: null,
      studentRecord: null
    };

    if (item.record.audience_type === 'individual' || item.record.student_id || item.record.student_email) {
      studentResolution = await resolveStudentReference(item.record, studentPreviewIndex);
      if (studentResolution.error) {
        issues.push(createIssue('error', 'schedule', item.rowNumber, studentResolution.error));
        summary.errors += 1;
        previews.push({
          ...item,
          action: 'error',
          status: 'error',
          existingId: null
        });
        continue;
      }
    }

    const groupName = item.record.audience_type === 'individual'
      ? (item.record.group_name || studentResolution.studentRecord?.group_name || 'INDIVIDUAL')
      : (item.record.group_name || studentResolution.studentRecord?.group_name || null);

    if (!groupName) {
      const message = `Schedule row ${item.rowNumber}: group_name could not be resolved.`;
      issues.push(createIssue('error', 'schedule', item.rowNumber, message));
      summary.errors += 1;
      previews.push({
        ...item,
        action: 'error',
        status: 'error',
        existingId: null
      });
      continue;
    }

    const preparedRecord = {
      day: item.record.day,
      time_slot: item.record.time_slot,
      group_name: groupName,
      audience_type: item.record.audience_type || 'group',
      subgroup_name: item.record.audience_type === 'subgroup' ? item.record.subgroup_name || null : null,
      student_user_id: item.record.audience_type === 'individual' ? studentResolution.studentUserId || null : null,
      subject: item.record.subject || courseResolution.courseRecord?.name || item.record.course_code,
      teacher: item.record.teacher || courseResolution.teacherName || null,
      room: item.record.room || null,
      course_id: courseResolution.courseId || null
    };

    let existing = null;
    let action = 'create';

    if (!studentResolution.deferredStudent && !courseResolution.deferredCourseCode) {
      existing = await findExistingScheduleEntry(preparedRecord);
      if (existing) {
        const comparable = getComparableScheduleRecord(preparedRecord);
        action = hasChanges(existing, comparable) ? 'update' : 'skip';
      }
    }

    summary.valid += 1;
    summary[action] += 1;

    previews.push({
      ...item,
      action,
      status: 'ready',
      existingId: existing?.id || null,
      resolvedStudentUserId: studentResolution.studentUserId,
      resolvedCourseId: courseResolution.courseId,
      deferredStudent: studentResolution.deferredStudent,
      deferredCourseCode: courseResolution.deferredCourseCode,
      preparedRecord
    });
  }

  return previews;
};

const writeJsonReport = (report, reportStem) => {
  ensureDirectory(path.dirname(reportStem));
  const jsonPath = `${reportStem}.json`;
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  return jsonPath;
};

const writeMarkdownReport = (report, reportStem) => {
  const lines = [
    '# CampusOS Data Import Report',
    '',
    `Generated: ${report.generatedAt}`,
    `Mode: ${report.mode}`,
    `Source: ${report.sourceLabel}`,
    '',
    '## Files',
    ''
  ];

  Object.entries(report.files).forEach(([entityKey, fileInfo]) => {
    lines.push(`- ${entityKey}: ${fileInfo.path}${fileInfo.sheetName ? ` (sheet: ${fileInfo.sheetName})` : ''}`);
  });

  lines.push('', '## Summary', '');

  Object.entries(report.summary).forEach(([entityKey, bucket]) => {
    lines.push(`### ${bucket.label}`);
    lines.push(`- rows: ${bucket.rows}`);
    lines.push(`- valid: ${bucket.valid}`);
    lines.push(`- warnings: ${bucket.warnings}`);
    lines.push(`- errors: ${bucket.errors}`);
    lines.push(`- create: ${bucket.create}`);
    lines.push(`- update: ${bucket.update}`);
    lines.push(`- skip: ${bucket.skip}`);
    lines.push('');
  });

  lines.push('## Issues', '');

  if (!report.issues.length) {
    lines.push('- No validation issues found.');
  } else {
    report.issues.slice(0, 40).forEach((issue) => {
      lines.push(`- [${issue.severity}] ${issue.entity} row ${issue.rowNumber}: ${issue.message}`);
    });
  }

  lines.push('', '## Preview', '');

  Object.entries(report.preview).forEach(([entityKey, items]) => {
    lines.push(`### ${ENTITY_CONFIG[entityKey].label}`);
    if (!items.length) {
      lines.push('- No rows supplied.', '');
      return;
    }

    items.slice(0, 8).forEach((item) => {
      lines.push(`- row ${item.rowNumber}: ${item.action} -> ${JSON.stringify(item.record)}`);
    });
    lines.push('');
  });

  const markdownPath = `${reportStem}.md`;
  fs.writeFileSync(markdownPath, lines.join('\n'));
  return markdownPath;
};

const timestampToken = () => new Date().toISOString().replace(/[:.]/g, '-');

const writeReportArtifacts = (report, preferredStem) => {
  ensureDirectory(REPORTS_DIR);
  const reportStem = preferredStem
    ? path.resolve(preferredStem.replace(/\.(json|md)$/i, ''))
    : path.join(REPORTS_DIR, `${report.mode}-${timestampToken()}`);

  return {
    jsonPath: writeJsonReport(report, reportStem),
    markdownPath: writeMarkdownReport(report, reportStem)
  };
};

const createImportedUser = async (record, passwordHash) => {
  const result = await db.run(
    `INSERT INTO users (
      student_id, email, password, name, role, group_name, subgroup_name, phone, avatar,
      date_of_birth, faculty, major, year_of_study, address, father_name,
      program_class, advisor, study_status, grant_type, registration_date, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.student_id || null,
      record.email,
      passwordHash,
      record.name,
      record.role,
      record.group_name || null,
      record.subgroup_name || null,
      record.phone || null,
      record.avatar || null,
      record.date_of_birth || null,
      record.faculty || null,
      record.major || null,
      record.year_of_study || null,
      record.address || null,
      record.father_name || null,
      record.program_class || null,
      record.advisor || null,
      record.study_status || null,
      record.grant_type || null,
      record.registration_date || null,
      record.is_active
    ]
  );

  return db.get('SELECT * FROM users WHERE id = ?', [result.id]);
};

const updateImportedUser = async (existingId, record) => {
  await db.run(
    `UPDATE users
     SET student_id = ?,
         email = ?,
         name = ?,
         role = ?,
         group_name = ?,
         subgroup_name = ?,
         phone = ?,
         avatar = ?,
         date_of_birth = ?,
         faculty = ?,
         major = ?,
         year_of_study = ?,
         address = ?,
         father_name = ?,
         program_class = ?,
         advisor = ?,
         study_status = ?,
         grant_type = ?,
         registration_date = ?,
         is_active = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      record.student_id || null,
      record.email,
      record.name,
      record.role,
      record.group_name || null,
      record.subgroup_name || null,
      record.phone || null,
      record.avatar || null,
      record.date_of_birth || null,
      record.faculty || null,
      record.major || null,
      record.year_of_study || null,
      record.address || null,
      record.father_name || null,
      record.program_class || null,
      record.advisor || null,
      record.study_status || null,
      record.grant_type || null,
      record.registration_date || null,
      record.is_active,
      existingId
    ]
  );

  return db.get('SELECT * FROM users WHERE id = ?', [existingId]);
};

const createImportedCourse = async (record, teacherId) => {
  const result = await db.run(
    'INSERT INTO courses (code, name, description, credits, semester, teacher_id) VALUES (?, ?, ?, ?, ?, ?)',
    [record.code, record.name, record.description, record.credits, record.semester, teacherId]
  );
  return db.get('SELECT * FROM courses WHERE id = ?', [result.id]);
};

const updateImportedCourse = async (existingId, record, teacherId) => {
  await db.run(
    `UPDATE courses
     SET code = ?,
         name = ?,
         description = ?,
         credits = ?,
         semester = ?,
         teacher_id = ?
     WHERE id = ?`,
    [record.code, record.name, record.description, record.credits, record.semester, teacherId, existingId]
  );

  return db.get('SELECT * FROM courses WHERE id = ?', [existingId]);
};

const createImportedEnrollment = async (record) => {
  if (record.enrolled_at) {
    const result = await db.run(
      'INSERT INTO course_enrollments (student_id, course_id, enrolled_at) VALUES (?, ?, ?)',
      [record.student_id, record.course_id, record.enrolled_at]
    );
    return db.get('SELECT * FROM course_enrollments WHERE id = ?', [result.id]);
  }

  const result = await db.run(
    'INSERT INTO course_enrollments (student_id, course_id) VALUES (?, ?)',
    [record.student_id, record.course_id]
  );
  return db.get('SELECT * FROM course_enrollments WHERE id = ?', [result.id]);
};

const updateImportedEnrollment = async (existingId, record) => {
  if (record.enrolled_at) {
    await db.run(
      `UPDATE course_enrollments
       SET enrolled_at = ?
       WHERE id = ?`,
      [record.enrolled_at, existingId]
    );
  }

  return db.get('SELECT * FROM course_enrollments WHERE id = ?', [existingId]);
};

const createImportedScheduleEntry = async (record) => {
  const result = await db.run(
    `INSERT INTO schedule (
      day, time_slot, group_name, audience_type, subgroup_name, student_user_id, subject, teacher, room, course_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      record.day,
      record.time_slot,
      record.group_name,
      record.audience_type,
      record.subgroup_name || null,
      record.student_user_id || null,
      record.subject,
      record.teacher || null,
      record.room || null,
      record.course_id || null
    ]
  );

  return db.get('SELECT * FROM schedule WHERE id = ?', [result.id]);
};

const updateImportedScheduleEntry = async (existingId, record) => {
  await db.run(
    `UPDATE schedule
     SET day = ?,
         time_slot = ?,
         group_name = ?,
         audience_type = ?,
         subgroup_name = ?,
         student_user_id = ?,
         subject = ?,
         teacher = ?,
         room = ?,
         course_id = ?
     WHERE id = ?`,
    [
      record.day,
      record.time_slot,
      record.group_name,
      record.audience_type,
      record.subgroup_name || null,
      record.student_user_id || null,
      record.subject,
      record.teacher || null,
      record.room || null,
      record.course_id || null,
      existingId
    ]
  );

  return db.get('SELECT * FROM schedule WHERE id = ?', [existingId]);
};

const buildAppliedStudentLookup = (items) => {
  const lookup = new Map();
  items.forEach((item) => {
    const userId = getPreviewItemId(item);
    if (!userId) {
      return;
    }

    if (item.record.student_id) {
      lookup.set(`student_id:${item.record.student_id}`, userId);
    }

    if (item.record.email) {
      lookup.set(`email:${item.record.email}`, userId);
    }
  });
  return lookup;
};

const buildAppliedCourseLookup = (items) => {
  const lookup = new Map();
  items.forEach((item) => {
    const courseId = getPreviewItemId(item);
    if (courseId && item.record.code) {
      lookup.set(item.record.code, courseId);
    }
  });
  return lookup;
};

const resolveAppliedStudentId = (item, appliedStudentLookup) => {
  if (item.resolvedStudentUserId) {
    return item.resolvedStudentUserId;
  }

  if (item.deferredStudent?.student_id && appliedStudentLookup.has(`student_id:${item.deferredStudent.student_id}`)) {
    return appliedStudentLookup.get(`student_id:${item.deferredStudent.student_id}`);
  }

  if (item.deferredStudent?.student_email && appliedStudentLookup.has(`email:${item.deferredStudent.student_email}`)) {
    return appliedStudentLookup.get(`email:${item.deferredStudent.student_email}`);
  }

  return null;
};

const resolveAppliedCourseId = (item, appliedCourseLookup) => {
  if (item.resolvedCourseId) {
    return item.resolvedCourseId;
  }

  if (item.deferredCourseCode && appliedCourseLookup.has(item.deferredCourseCode)) {
    return appliedCourseLookup.get(item.deferredCourseCode);
  }

  return null;
};

const applyImportPlan = async (report) => {
  const createdUsers = [];
  const passwordSeed = String(process.env.IMPORT_DEFAULT_PASSWORD || '').trim();
  const requiresPassword = [...report.preview.students, ...report.preview.teachers].some((item) => item.action === 'create');

  if (requiresPassword && !passwordSeed) {
    throw new Error('IMPORT_DEFAULT_PASSWORD is required to create new users during apply mode.');
  }

  let passwordHash = null;
  if (requiresPassword) {
    const salt = await bcrypt.genSalt(10);
    passwordHash = await bcrypt.hash(passwordSeed, salt);
  }

  for (const entityKey of ['teachers', 'students']) {
    for (const item of report.preview[entityKey]) {
      if (item.action === 'create') {
        const created = await createImportedUser(item.record, passwordHash);
        createdUsers.push(created);
        item.appliedId = created.id;
      } else if (item.action === 'update') {
        const updated = await updateImportedUser(item.existingId, item.record);
        item.appliedId = updated.id;
      }
    }
  }

  const teacherIdByEmail = new Map(
    [...createdUsers]
      .filter((user) => user.role === 'teacher')
      .map((user) => [normalizeEmail(user.email), user.id])
  );

  report.preview.teachers.forEach((item) => {
    if (item.appliedId) {
      teacherIdByEmail.set(item.record.email, item.appliedId);
    } else if (item.existingId) {
      teacherIdByEmail.set(item.record.email, item.existingId);
    }
  });

  for (const item of report.preview.courses) {
    if (item.action === 'skip' || item.action === 'error') {
      continue;
    }

    const teacherId = item.record.teacher_email
      ? teacherIdByEmail.get(item.record.teacher_email) || item.teacherId || null
      : null;

    if (item.action === 'create') {
      const createdCourse = await createImportedCourse(item.record, teacherId);
      item.appliedId = createdCourse.id;
    } else if (item.action === 'update') {
      const updatedCourse = await updateImportedCourse(item.existingId, item.record, teacherId);
      item.appliedId = updatedCourse.id;
    }
  }

  const appliedStudentLookup = buildAppliedStudentLookup(report.preview.students);
  const appliedCourseLookup = buildAppliedCourseLookup(report.preview.courses);

  for (const item of report.preview.enrollments || []) {
    if (item.action === 'skip' || item.action === 'error') {
      continue;
    }

    const studentId = resolveAppliedStudentId(item, appliedStudentLookup);
    const courseId = resolveAppliedCourseId(item, appliedCourseLookup);

    if (!studentId || !courseId) {
      throw new Error(`Unable to resolve enrollment row ${item.rowNumber} during apply mode.`);
    }

    const preparedRecord = {
      ...item.preparedRecord,
      student_id: studentId,
      course_id: courseId
    };

    if (item.action === 'create') {
      const createdEnrollment = await createImportedEnrollment(preparedRecord);
      item.appliedId = createdEnrollment.id;
    } else if (item.action === 'update') {
      const updatedEnrollment = await updateImportedEnrollment(item.existingId, preparedRecord);
      item.appliedId = updatedEnrollment.id;
    }
  }

  for (const item of report.preview.schedule || []) {
    if (item.action === 'skip' || item.action === 'error') {
      continue;
    }

    const studentId = resolveAppliedStudentId(item, appliedStudentLookup);
    const courseId = resolveAppliedCourseId(item, appliedCourseLookup);

    const preparedRecord = {
      ...item.preparedRecord,
      student_user_id: item.preparedRecord.audience_type === 'individual' ? studentId : null,
      course_id: courseId
    };

    if (!preparedRecord.course_id) {
      throw new Error(`Unable to resolve schedule row ${item.rowNumber} during apply mode.`);
    }

    if (preparedRecord.audience_type === 'individual' && !preparedRecord.student_user_id) {
      throw new Error(`Unable to resolve individual student for schedule row ${item.rowNumber} during apply mode.`);
    }

    if (item.action === 'create') {
      const createdEntry = await createImportedScheduleEntry(preparedRecord);
      item.appliedId = createdEntry.id;
    } else if (item.action === 'update') {
      const updatedEntry = await updateImportedScheduleEntry(item.existingId, preparedRecord);
      item.appliedId = updatedEntry.id;
    }
  }
};

const findImportFile = (directoryPath, filenameBase) => {
  for (const extension of SUPPORTED_IMPORT_EXTENSIONS) {
    const candidatePath = path.join(directoryPath, `${filenameBase}${extension}`);
    if (fs.existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  return null;
};

const detectInboxFiles = (directoryPath = INBOX_DIR) => {
  const files = {};

  Object.entries(ENTITY_CONFIG).forEach(([entityKey, config]) => {
    const discoveredPath = findImportFile(directoryPath, config.filenameBase);
    if (discoveredPath) {
      files[entityKey] = {
        path: discoveredPath,
        sheetName: null
      };
    }
  });

  return files;
};

const RECONCILIATION_FIELDS = {
  students: [
    'student_id',
    'name',
    'email',
    'group_name',
    'subgroup_name',
    'faculty',
    'major',
    'year_of_study',
    'phone',
    'advisor',
    'study_status',
    'grant_type',
    'program_class',
    'registration_date',
    'date_of_birth',
    'address',
    'father_name'
  ],
  teachers: [
    'name',
    'email',
    'faculty',
    'major',
    'phone',
    'advisor',
    'address'
  ],
  courses: [
    'code',
    'name',
    'description',
    'credits',
    'semester',
    'teacher_email'
  ],
  enrollments: [
    'student_id',
    'student_email',
    'course_code',
    'enrolled_at'
  ],
  schedule: [
    'course_code',
    'day',
    'time_slot',
    'group_name',
    'audience_type',
    'subgroup_name',
    'student_id',
    'student_email',
    'room',
    'subject',
    'teacher'
  ]
};

const buildReconciliationSummaryBucket = (label) => ({
  label,
  rowsInExport: 0,
  rowsInCampusOS: 0,
  matched: 0,
  mismatched: 0,
  onlyInExport: 0,
  onlyInCampusOS: 0,
  invalid: 0,
  duplicateExport: 0,
  duplicateCampusOS: 0
});

const getReconciliationKey = (entityKey, record) => {
  if (entityKey === 'students') {
    return record.student_id || record.email || '';
  }

  if (entityKey === 'teachers') {
    return record.email || '';
  }

  if (entityKey === 'courses') {
    return record.code || '';
  }

  if (entityKey === 'enrollments') {
    return `${record.student_id || record.student_email || ''}|${record.course_code || ''}`;
  }

  return [
    record.day || '',
    record.time_slot || '',
    record.course_code || '',
    record.audience_type || 'group',
    record.group_name || '',
    record.subgroup_name || '',
    record.student_id || record.student_email || ''
  ].join('|');
};

const buildRecordIndex = (items, entityKey, getRecord) => {
  const index = new Map();

  items.forEach((item) => {
    const record = getRecord(item);
    const key = getReconciliationKey(entityKey, record);
    if (!key) {
      return;
    }

    if (!index.has(key)) {
      index.set(key, []);
    }

    index.get(key).push(item);
  });

  return index;
};

const getComparableReconciliationValue = (field, value) => {
  const cleaned = sanitizeCell(value);
  if (!cleaned) {
    return '';
  }

  if (field === 'enrolled_at') {
    return cleaned.replace(/ 00:00:00$/, '');
  }

  return cleaned;
};

const collectReconciliationDifferences = (entityKey, exportRecord, campusRecord) => (
  RECONCILIATION_FIELDS[entityKey].reduce((differences, field) => {
    const exportValue = getComparableReconciliationValue(field, exportRecord[field]);

    if (!exportValue) {
      return differences;
    }

    const campusValue = getComparableReconciliationValue(field, campusRecord[field]);
    if (exportValue !== campusValue) {
      differences.push({
        field,
        exportValue: exportRecord[field] ?? null,
        campusValue: campusRecord[field] ?? null
      });
    }

    return differences;
  }, [])
);

const loadCampusRecords = async (entityKey) => {
  if (entityKey === 'students') {
    const rows = await db.all(
      `SELECT
         student_id, name, email, group_name, subgroup_name, faculty, major, year_of_study,
         phone, advisor, study_status, grant_type, program_class, registration_date,
         date_of_birth, address, father_name
       FROM users
       WHERE role = ?`,
      ['student']
    );

    return rows.map((row) => normalizeStudentRecord(row));
  }

  if (entityKey === 'teachers') {
    const rows = await db.all(
      `SELECT
         name, email, faculty, major, phone, advisor, address
       FROM users
       WHERE role = ?`,
      ['teacher']
    );

    return rows.map((row) => normalizeTeacherRecord(row));
  }

  if (entityKey === 'courses') {
    const rows = await db.all(
      `SELECT
         c.code,
         c.name,
         c.description,
         c.credits,
         c.semester,
         u.email AS teacher_email
       FROM courses c
       LEFT JOIN users u ON u.id = c.teacher_id`
    );

    return rows.map((row) => normalizeCourseRecord(row));
  }

  if (entityKey === 'enrollments') {
    const rows = await db.all(
      `SELECT
         u.student_id,
         u.email AS student_email,
         c.code AS course_code,
         ce.enrolled_at
       FROM course_enrollments ce
       JOIN users u ON u.id = ce.student_id
       JOIN courses c ON c.id = ce.course_id`
    );

    return rows.map((row) => normalizeEnrollmentRecord(row));
  }

  const rows = await db.all(
    `SELECT
       c.code AS course_code,
       s.day,
       s.time_slot,
       s.group_name,
       s.audience_type,
       s.subgroup_name,
       u.student_id,
       u.email AS student_email,
       s.room,
       s.subject,
       s.teacher
     FROM schedule s
     LEFT JOIN users u ON u.id = s.student_user_id
     LEFT JOIN courses c ON c.id = s.course_id`
  );

  return rows.map((row) => normalizeScheduleRecord(row));
};

const formatReconciliationFinding = (finding) => {
  if (finding.status === 'duplicate_export') {
    return `${finding.entity} ${finding.key}: duplicate rows in export (${finding.count}).`;
  }

  if (finding.status === 'duplicate_campusos') {
    return `${finding.entity} ${finding.key}: duplicate rows already exist in CampusOS (${finding.count}).`;
  }

  if (finding.status === 'only_in_export') {
    return `${finding.entity} ${finding.key}: present in export but missing in CampusOS.`;
  }

  if (finding.status === 'only_in_campusos') {
    return `${finding.entity} ${finding.key}: present in CampusOS but missing in export.`;
  }

  const diffSummary = finding.differences
    .slice(0, 4)
    .map((diff) => `${diff.field}: export="${diff.exportValue ?? ''}" vs campus="${diff.campusValue ?? ''}"`)
    .join('; ');

  return `${finding.entity} ${finding.key}: field mismatches -> ${diffSummary}`;
};

const writeReconciliationMarkdownReport = (report, reportStem) => {
  const lines = [
    '# CampusOS Reconciliation Report',
    '',
    `Generated: ${report.generatedAt}`,
    `Source: ${report.sourceLabel}`,
    '',
    '## Files',
    ''
  ];

  Object.entries(report.files).forEach(([entityKey, fileInfo]) => {
    lines.push(`- ${entityKey}: ${fileInfo.path}${fileInfo.sheetName ? ` (sheet: ${fileInfo.sheetName})` : ''}`);
  });

  lines.push('', '## Summary', '');

  Object.values(report.summary).forEach((bucket) => {
    lines.push(`### ${bucket.label}`);
    lines.push(`- rows in export: ${bucket.rowsInExport}`);
    lines.push(`- rows in CampusOS: ${bucket.rowsInCampusOS}`);
    lines.push(`- matched: ${bucket.matched}`);
    lines.push(`- mismatched: ${bucket.mismatched}`);
    lines.push(`- only in export: ${bucket.onlyInExport}`);
    lines.push(`- only in CampusOS: ${bucket.onlyInCampusOS}`);
    lines.push(`- invalid: ${bucket.invalid}`);
    lines.push(`- duplicate export rows: ${bucket.duplicateExport}`);
    lines.push(`- duplicate CampusOS rows: ${bucket.duplicateCampusOS}`);
    lines.push('');
  });

  lines.push('## Validation Issues', '');

  if (!report.issues.length) {
    lines.push('- No validation issues found.');
  } else {
    report.issues.slice(0, 40).forEach((issue) => {
      lines.push(`- [${issue.severity}] ${issue.entity} row ${issue.rowNumber}: ${issue.message}`);
    });
  }

  lines.push('', '## Findings', '');

  if (!report.findings.length) {
    lines.push('- No reconciliation mismatches found.');
  } else {
    report.findings.slice(0, 60).forEach((finding) => {
      lines.push(`- [${finding.status}] ${formatReconciliationFinding(finding)}`);
    });
  }

  const markdownPath = `${reportStem}.md`;
  fs.writeFileSync(markdownPath, lines.join('\n'));
  return markdownPath;
};

const writeReconciliationArtifacts = (report, preferredStem) => {
  ensureDirectory(REPORTS_DIR);
  const reportStem = preferredStem
    ? path.resolve(preferredStem.replace(/\.(json|md)$/i, ''))
    : path.join(REPORTS_DIR, `reconciliation-${timestampToken()}`);

  return {
    jsonPath: writeJsonReport(report, reportStem),
    markdownPath: writeReconciliationMarkdownReport(report, reportStem)
  };
};

const reconcileEntityRecords = (entityKey, exportItems, campusRecords, issues) => {
  const summary = buildReconciliationSummaryBucket(ENTITY_CONFIG[entityKey].label);
  const findings = [];
  const validExportItems = [];

  summary.rowsInExport = exportItems.length;
  summary.rowsInCampusOS = campusRecords.length;

  exportItems.forEach((item) => {
    item.errors.forEach((message) => issues.push(createIssue('error', entityKey, item.rowNumber, message)));
    item.warnings.forEach((message) => issues.push(createIssue('warning', entityKey, item.rowNumber, message)));

    if (item.errors.length) {
      summary.invalid += 1;
      return;
    }

    validExportItems.push(item);
  });

  const exportIndex = buildRecordIndex(validExportItems, entityKey, (item) => item.record);
  const campusIndex = buildRecordIndex(campusRecords, entityKey, (item) => item);

  exportIndex.forEach((records, key) => {
    if (records.length > 1) {
      summary.duplicateExport += records.length;
      findings.push({
        entity: entityKey,
        key,
        status: 'duplicate_export',
        count: records.length
      });
    }
  });

  campusIndex.forEach((records, key) => {
    if (records.length > 1) {
      summary.duplicateCampusOS += records.length;
      findings.push({
        entity: entityKey,
        key,
        status: 'duplicate_campusos',
        count: records.length
      });
    }
  });

  exportIndex.forEach((records, key) => {
    if (records.length !== 1) {
      return;
    }

    const campusMatches = campusIndex.get(key) || [];
    if (campusMatches.length !== 1) {
      if (!campusMatches.length) {
        summary.onlyInExport += 1;
        findings.push({
          entity: entityKey,
          key,
          status: 'only_in_export',
          record: records[0].record
        });
      }
      return;
    }

    const differences = collectReconciliationDifferences(entityKey, records[0].record, campusMatches[0]);
    if (differences.length) {
      summary.mismatched += 1;
      findings.push({
        entity: entityKey,
        key,
        status: 'mismatch',
        differences
      });
      return;
    }

    summary.matched += 1;
  });

  campusIndex.forEach((records, key) => {
    if (records.length !== 1) {
      return;
    }

    if (!exportIndex.has(key)) {
      summary.onlyInCampusOS += 1;
      findings.push({
        entity: entityKey,
        key,
        status: 'only_in_campusos',
        record: records[0]
      });
    }
  });

  return { summary, findings };
};

const runReconciliationWorkflow = async (options = {}) => {
  const {
    studentsFile,
    teachersFile,
    coursesFile,
    enrollmentsFile,
    scheduleFile,
    studentsSheet,
    teachersSheet,
    coursesSheet,
    enrollmentsSheet,
    scheduleSheet,
    sourceLabel = 'university-export-reconciliation',
    reportStem = null
  } = options;

  const files = {};
  if (studentsFile) {
    files.students = { path: path.resolve(studentsFile), sheetName: studentsSheet || null };
  }
  if (teachersFile) {
    files.teachers = { path: path.resolve(teachersFile), sheetName: teachersSheet || null };
  }
  if (coursesFile) {
    files.courses = { path: path.resolve(coursesFile), sheetName: coursesSheet || null };
  }
  if (enrollmentsFile) {
    files.enrollments = { path: path.resolve(enrollmentsFile), sheetName: enrollmentsSheet || null };
  }
  if (scheduleFile) {
    files.schedule = { path: path.resolve(scheduleFile), sheetName: scheduleSheet || null };
  }

  if (!Object.keys(files).length) {
    throw new Error('No reconciliation files were provided.');
  }

  Object.values(files).forEach((fileInfo) => {
    if (!fs.existsSync(fileInfo.path)) {
      throw new Error(`Reconciliation file was not found: ${fileInfo.path}`);
    }
  });

  await db.migrate();

  const issues = [];
  const summary = {};
  const findings = [];

  for (const [entityKey, fileInfo] of Object.entries(files)) {
    const exportItems = await parseEntityRows(entityKey, fileInfo.path, fileInfo.sheetName);
    const campusRecords = await loadCampusRecords(entityKey);
    const entityReport = reconcileEntityRecords(entityKey, exportItems, campusRecords, issues);

    summary[entityKey] = entityReport.summary;
    findings.push(...entityReport.findings);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'reconciliation',
    sourceLabel,
    files,
    summary,
    issues,
    findings
  };

  const artifacts = writeReconciliationArtifacts(report, reportStem);
  return {
    report,
    artifacts
  };
};

const runImportWorkflow = async (options = {}) => {
  const {
    studentsFile,
    teachersFile,
    coursesFile,
    enrollmentsFile,
    scheduleFile,
    studentsSheet,
    teachersSheet,
    coursesSheet,
    enrollmentsSheet,
    scheduleSheet,
    apply = false,
    sourceLabel = 'manual-import',
    reportStem = null
  } = options;

  const files = {};
  if (studentsFile) {
    files.students = { path: path.resolve(studentsFile), sheetName: studentsSheet || null };
  }
  if (teachersFile) {
    files.teachers = { path: path.resolve(teachersFile), sheetName: teachersSheet || null };
  }
  if (coursesFile) {
    files.courses = { path: path.resolve(coursesFile), sheetName: coursesSheet || null };
  }
  if (enrollmentsFile) {
    files.enrollments = { path: path.resolve(enrollmentsFile), sheetName: enrollmentsSheet || null };
  }
  if (scheduleFile) {
    files.schedule = { path: path.resolve(scheduleFile), sheetName: scheduleSheet || null };
  }

  if (!Object.keys(files).length) {
    throw new Error('No import files were provided.');
  }

  Object.values(files).forEach((fileInfo) => {
    if (!fs.existsSync(fileInfo.path)) {
      throw new Error(`Import file was not found: ${fileInfo.path}`);
    }
  });

  await db.migrate();

  const summary = {
    students: buildSummaryBucket('Students'),
    teachers: buildSummaryBucket('Teachers'),
    courses: buildSummaryBucket('Courses'),
    enrollments: buildSummaryBucket('Enrollments'),
    schedule: buildSummaryBucket('Schedule')
  };
  const issues = [];

  const studentItems = files.students
    ? await parseEntityRows('students', files.students.path, files.students.sheetName)
    : [];
  const teacherItems = files.teachers
    ? await parseEntityRows('teachers', files.teachers.path, files.teachers.sheetName)
    : [];
  const courseItems = files.courses
    ? await parseEntityRows('courses', files.courses.path, files.courses.sheetName)
    : [];
  const enrollmentItems = files.enrollments
    ? await parseEntityRows('enrollments', files.enrollments.path, files.enrollments.sheetName)
    : [];
  const scheduleItems = files.schedule
    ? await parseEntityRows('schedule', files.schedule.path, files.schedule.sheetName)
    : [];

  const preview = {
    students: await classifyUserRows('students', studentItems, summary.students, issues),
    teachers: await classifyUserRows('teachers', teacherItems, summary.teachers, issues),
    courses: [],
    enrollments: [],
    schedule: []
  };

  const teacherPreviewByEmail = new Map(
    preview.teachers.map((item) => [item.record.email, item])
  );
  const studentPreviewIndex = getPreviewLookupIndex(preview.students, ['student_id', 'email']);

  preview.courses = await classifyCourseRows(courseItems, summary.courses, issues, teacherPreviewByEmail);
  const coursePreviewByCode = new Map(
    preview.courses.map((item) => [item.record.code, item])
  );
  preview.enrollments = await classifyEnrollmentRows(
    enrollmentItems,
    summary.enrollments,
    issues,
    studentPreviewIndex,
    coursePreviewByCode,
    teacherPreviewByEmail
  );
  preview.schedule = await classifyScheduleRows(
    scheduleItems,
    summary.schedule,
    issues,
    studentPreviewIndex,
    coursePreviewByCode,
    teacherPreviewByEmail
  );

  const report = {
    generatedAt: new Date().toISOString(),
    mode: apply ? 'apply' : 'preview',
    sourceLabel,
    files,
    summary,
    issues,
    preview
  };

  if (apply) {
    await applyImportPlan(report);
  }

  const artifacts = writeReportArtifacts(report, reportStem);
  return {
    report,
    artifacts
  };
};

module.exports = {
  IMPORT_ROOT,
  INBOX_DIR,
  REPORTS_DIR,
  SUPPORTED_IMPORT_EXTENSIONS,
  detectInboxFiles,
  runImportWorkflow,
  runReconciliationWorkflow
};
