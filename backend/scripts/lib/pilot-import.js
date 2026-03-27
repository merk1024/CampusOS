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

const ensureDirectory = (directoryPath) => {
  fs.mkdirSync(directoryPath, { recursive: true });
};

const sanitizeCell = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
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

  return parsed.toISOString().slice(0, 10);
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
  code: sanitizeCell(record.code).toUpperCase(),
  name: sanitizeCell(record.name),
  description: sanitizeCell(record.description) || null,
  credits: parsePositiveInteger(record.credits),
  semester: sanitizeCell(record.semester) || null,
  teacher_email: normalizeEmail(record.teacher_email) || null
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

const parseEntityRows = async (entityKey, filePath, sheetName) => {
  const rows = readTabularFile(filePath, sheetName);
  return rows.map((rawRow, index) => {
    const rowNumber = index + 2;
    const { canonical, unknownColumns } = pickCanonicalRecord(entityKey, rawRow);
    const normalized = entityKey === 'students'
      ? normalizeStudentRecord(canonical)
      : entityKey === 'teachers'
        ? normalizeTeacherRecord(canonical)
        : normalizeCourseRecord(canonical);
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

const runImportWorkflow = async (options = {}) => {
  const {
    studentsFile,
    teachersFile,
    coursesFile,
    studentsSheet,
    teachersSheet,
    coursesSheet,
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
    courses: buildSummaryBucket('Courses')
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

  const preview = {
    students: await classifyUserRows('students', studentItems, summary.students, issues),
    teachers: await classifyUserRows('teachers', teacherItems, summary.teachers, issues),
    courses: []
  };

  const teacherPreviewByEmail = new Map(
    preview.teachers.map((item) => [item.record.email, item])
  );

  preview.courses = await classifyCourseRows(courseItems, summary.courses, issues, teacherPreviewByEmail);

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
  runImportWorkflow
};
