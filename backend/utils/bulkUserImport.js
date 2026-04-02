const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const db = require('../config/database');

const ACTIVE_STATUS = db.client === 'postgres' ? true : 1;
const ALLOWED_ROLES = new Set(['student', 'teacher', 'admin']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const HEADER_ALIASES = new Map([
  ['name', 'name'],
  ['full_name', 'name'],
  ['fullname', 'name'],
  ['email', 'email'],
  ['mail', 'email'],
  ['role', 'role'],
  ['password', 'password'],
  ['student_id', 'student_id'],
  ['studentid', 'student_id'],
  ['student_number', 'student_id'],
  ['group_name', 'group_name'],
  ['group', 'group_name'],
  ['subgroup_name', 'subgroup_name'],
  ['subgroup', 'subgroup_name'],
  ['phone', 'phone'],
  ['phone_number', 'phone'],
  ['date_of_birth', 'date_of_birth'],
  ['birth_date', 'date_of_birth'],
  ['faculty', 'faculty'],
  ['major', 'major'],
  ['year_of_study', 'year_of_study'],
  ['year', 'year_of_study'],
  ['address', 'address'],
  ['emergency_contact', 'emergency_contact'],
  ['father_name', 'father_name'],
  ['program_class', 'program_class'],
  ['advisor', 'advisor'],
  ['study_status', 'study_status'],
  ['balance_info', 'balance_info'],
  ['grant_type', 'grant_type'],
  ['registration_date', 'registration_date']
]);

const sanitizeCell = (value) => {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim();
};

const normalizeHeaderKey = (value) => (
  sanitizeCell(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
);

const normalizeOptionalText = (value) => {
  const normalized = sanitizeCell(value);
  return normalized ? normalized : null;
};

const normalizeEmail = (value) => {
  const normalized = sanitizeCell(value).toLowerCase();
  return normalized || null;
};

const parsePositiveInteger = (value) => {
  const normalized = sanitizeCell(value);
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
};

const normalizeDate = (value) => {
  const normalized = sanitizeCell(value);
  if (!normalized) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return normalized;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

const parseDelimitedLine = (line, delimiter) => {
  const cells = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        current += '"';
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (character === delimiter && !inQuotes) {
      cells.push(current);
      current = '';
      continue;
    }

    current += character;
  }

  cells.push(current);
  return cells;
};

const parseDelimitedText = (contents, delimiter) => {
  const normalized = contents.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const physicalLines = normalized.split('\n');
  const logicalLines = [];
  let buffer = '';
  let quoteBalance = 0;

  physicalLines.forEach((line) => {
    buffer = buffer ? `${buffer}\n${line}` : line;

    const unescapedQuotes = (line.match(/(?<!")"(?!")/g) || []).length;
    quoteBalance += unescapedQuotes;

    if (quoteBalance % 2 === 0) {
      logicalLines.push(buffer);
      buffer = '';
      quoteBalance = 0;
    }
  });

  if (buffer) {
    logicalLines.push(buffer);
  }

  return logicalLines
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0)
    .map((line) => parseDelimitedLine(line, delimiter).map((cell) => sanitizeCell(cell)));
};

const detectDelimiter = (contents) => {
  const firstLine = contents.replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0] || '';
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  return tabCount > commaCount ? '\t' : ',';
};

const toCanonicalRecord = (headers, row) => {
  const record = {};

  headers.forEach((header, index) => {
    if (!header) {
      return;
    }

    const canonicalKey = HEADER_ALIASES.get(normalizeHeaderKey(header));
    if (!canonicalKey || record[canonicalKey]) {
      return;
    }

    record[canonicalKey] = sanitizeCell(row[index]);
  });

  return record;
};

const normalizeRecord = (record) => {
  const role = sanitizeCell(record.role).toLowerCase();

  return {
    name: normalizeOptionalText(record.name),
    email: normalizeEmail(record.email),
    role,
    password: sanitizeCell(record.password),
    student_id: role === 'student' ? normalizeOptionalText(record.student_id) : null,
    group_name: role === 'student' ? normalizeOptionalText(record.group_name) : null,
    subgroup_name: role === 'student' ? normalizeOptionalText(record.subgroup_name) : null,
    phone: normalizeOptionalText(record.phone),
    date_of_birth: normalizeDate(record.date_of_birth),
    faculty: normalizeOptionalText(record.faculty),
    major: normalizeOptionalText(record.major),
    year_of_study: parsePositiveInteger(record.year_of_study),
    address: normalizeOptionalText(record.address),
    emergency_contact: normalizeOptionalText(record.emergency_contact),
    father_name: normalizeOptionalText(record.father_name),
    program_class: normalizeOptionalText(record.program_class),
    advisor: normalizeOptionalText(record.advisor),
    study_status: normalizeOptionalText(record.study_status),
    balance_info: normalizeOptionalText(record.balance_info),
    grant_type: normalizeOptionalText(record.grant_type),
    registration_date: normalizeDate(record.registration_date),
    avatar: buildAvatar(record.name),
    is_active: ACTIVE_STATUS
  };
};

const createRowResult = (rowNumber, record) => ({
  rowNumber,
  action: 'error',
  name: record.name || 'Unnamed user',
  email: record.email || 'No email',
  role: record.role || 'unknown',
  student_id: record.student_id || null,
  group_name: record.group_name || null,
  note: 'Validation error',
  errors: [],
  warnings: []
});

const validateRecord = (rowResult, sourceRecord) => {
  if (!rowResult.name) {
    rowResult.errors.push('Name is required.');
  }

  if (!rowResult.email) {
    rowResult.errors.push('Email is required.');
  } else if (!EMAIL_PATTERN.test(rowResult.email)) {
    rowResult.errors.push('Email format is invalid.');
  }

  if (!rowResult.role) {
    rowResult.errors.push('Role is required.');
  } else if (!ALLOWED_ROLES.has(rowResult.role)) {
    rowResult.errors.push('Role must be student, teacher, or admin.');
  }

  if (rowResult.role === 'student') {
    if (!rowResult.student_id) {
      rowResult.errors.push('Student ID is required for student accounts.');
    }

    if (!rowResult.group_name) {
      rowResult.errors.push('Group is required for student accounts.');
    }
  }

  if (sanitizeCell(sourceRecord.year_of_study) && rowResult.year_of_study === null) {
    rowResult.errors.push('Year of study must be a positive integer.');
  }

  if (sanitizeCell(sourceRecord.date_of_birth) && !rowResult.date_of_birth) {
    rowResult.errors.push('Date of birth must be a valid date.');
  }

  if (sanitizeCell(sourceRecord.registration_date) && !rowResult.registration_date) {
    rowResult.errors.push('Registration date must be a valid date.');
  }
};

const generateTemporaryPassword = () => {
  const entropy = crypto.randomBytes(9).toString('base64url');
  return `Cx!${entropy.slice(0, 10)}9`;
};

const parseBulkUserRows = (csvText) => {
  const normalized = String(csvText || '').trim();
  if (!normalized) {
    throw new Error('Paste CSV or TSV content first.');
  }

  const rows = parseDelimitedText(normalized, detectDelimiter(normalized));
  if (rows.length < 2) {
    throw new Error('The import needs a header row and at least one data row.');
  }

  const [headers, ...dataRows] = rows;
  const canonicalHeaders = headers
    .map((header) => HEADER_ALIASES.get(normalizeHeaderKey(header)))
    .filter(Boolean);

  if (!canonicalHeaders.length) {
    throw new Error('The header row does not contain supported CampusOS user columns.');
  }

  return dataRows.map((row, index) => ({
    rowNumber: index + 2,
    sourceRecord: toCanonicalRecord(headers, row),
    normalizedRecord: normalizeRecord(toCanonicalRecord(headers, row))
  }));
};

const buildPreview = async (csvText) => {
  const parsedRows = parseBulkUserRows(csvText);
  const emailCounts = new Map();
  const studentIdCounts = new Map();

  parsedRows.forEach(({ normalizedRecord }) => {
    if (normalizedRecord.email) {
      emailCounts.set(normalizedRecord.email, (emailCounts.get(normalizedRecord.email) || 0) + 1);
    }

    if (normalizedRecord.role === 'student' && normalizedRecord.student_id) {
      studentIdCounts.set(normalizedRecord.student_id, (studentIdCounts.get(normalizedRecord.student_id) || 0) + 1);
    }
  });

  const rows = [];

  for (const parsedRow of parsedRows) {
    const rowResult = {
      ...createRowResult(parsedRow.rowNumber, parsedRow.normalizedRecord),
      ...parsedRow.normalizedRecord
    };

    validateRecord(rowResult, parsedRow.sourceRecord);

    if (rowResult.email && emailCounts.get(rowResult.email) > 1) {
      rowResult.errors.push('Email is duplicated inside this import.');
    }

    if (rowResult.role === 'student' && rowResult.student_id && studentIdCounts.get(rowResult.student_id) > 1) {
      rowResult.errors.push('Student ID is duplicated inside this import.');
    }

    if (!rowResult.errors.length) {
      const existingByEmail = rowResult.email
        ? await db.get(
            `SELECT id, email, role, student_id
             FROM users
             WHERE email = ?`,
            [rowResult.email]
          )
        : null;

      const existingByStudentId = rowResult.student_id
        ? await db.get(
            `SELECT id, email, role, student_id
             FROM users
             WHERE student_id = ?`,
            [rowResult.student_id]
          )
        : null;

      if (existingByEmail && existingByStudentId && existingByEmail.id !== existingByStudentId.id) {
        rowResult.errors.push('Email and student ID match different existing accounts.');
      } else if (existingByEmail || existingByStudentId) {
        const existingUser = existingByEmail || existingByStudentId;
        rowResult.action = 'skip';
        rowResult.note = `Skipped: account already exists for ${existingUser.email || existingUser.student_id}.`;
      } else {
        rowResult.action = 'create';
        rowResult.note = rowResult.password
          ? 'Ready to create with the provided password.'
          : 'Ready to create with a generated temporary password.';
      }
    }

    if (rowResult.errors.length) {
      rowResult.action = 'error';
      rowResult.note = rowResult.errors[0];
    }

    rows.push(rowResult);
  }

  return {
    summary: {
      total: rows.length,
      create: rows.filter((row) => row.action === 'create').length,
      skip: rows.filter((row) => row.action === 'skip').length,
      error: rows.filter((row) => row.action === 'error').length,
      generatedPasswords: rows.filter((row) => row.action === 'create' && !row.password).length
    },
    rows
  };
};

const insertUser = async (row, password) => {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  const result = await db.run(
    `INSERT INTO users (
      email, password, name, role, student_id, group_name, subgroup_name, phone,
      avatar, date_of_birth, faculty, major, year_of_study, address, emergency_contact,
      father_name, program_class, advisor, study_status, balance_info, grant_type, registration_date, is_active
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.email,
      hashedPassword,
      row.name,
      row.role,
      row.student_id,
      row.group_name,
      row.subgroup_name,
      row.phone,
      row.avatar,
      row.date_of_birth,
      row.faculty,
      row.major,
      row.year_of_study,
      row.address,
      row.emergency_contact,
      row.father_name,
      row.program_class,
      row.advisor,
      row.study_status,
      row.balance_info,
      row.grant_type,
      row.registration_date,
      row.is_active
    ]
  );

  return result.id;
};

const previewBulkUserImport = async (csvText) => buildPreview(csvText);

const applyBulkUserImport = async (csvText) => {
  const preview = await buildPreview(csvText);
  const credentials = [];

  for (const row of preview.rows) {
    if (row.action !== 'create') {
      continue;
    }

    const password = row.password || generateTemporaryPassword();
    const createdId = await insertUser(row, password);

    row.action = 'created';
    row.createdId = createdId;
    row.note = row.password
      ? 'Created successfully with the provided password.'
      : 'Created successfully with a generated temporary password.';

    if (!row.password) {
      credentials.push({
        id: createdId,
        name: row.name,
        email: row.email,
        role: row.role,
        student_id: row.student_id || null,
        password
      });
    }
  }

  return {
    summary: {
      total: preview.summary.total,
      created: preview.rows.filter((row) => row.action === 'created').length,
      skipped: preview.rows.filter((row) => row.action === 'skip').length,
      errors: preview.rows.filter((row) => row.action === 'error').length,
      generatedPasswords: credentials.length
    },
    rows: preview.rows,
    credentials
  };
};

module.exports = {
  previewBulkUserImport,
  applyBulkUserImport
};
