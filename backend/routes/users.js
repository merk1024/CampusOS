const express = require('express');
const bcrypt = require('bcryptjs');

const router = express.Router();
const { auth, isAdmin } = require('../middleware/auth');
const db = require('../config/database');
const { applyBulkUserImport, previewBulkUserImport } = require('../utils/bulkUserImport');
const { hasAdminAccess, hasSuperadminAccess } = require('../utils/access');

const PROFILE_FIELDS = `
  id,
  email,
  name,
  role,
  student_id,
  group_name,
  subgroup_name,
  phone,
  avatar,
  date_of_birth,
  faculty,
  major,
  year_of_study,
  address,
  emergency_contact,
  father_name,
  program_class,
  advisor,
  study_status,
  balance_info,
  grant_type,
  is_active,
  is_superadmin,
  last_login_at,
  last_login_ip,
  registration_date,
  created_at
`;

const normalizeOptionalText = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized ? normalized : null;
};

const normalizeOptionalInteger = (value) => {
  const normalized = normalizeOptionalText(value);
  if (normalized === null) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const toActiveDatabaseValue = (isActive) => (
  db.client === 'postgres'
    ? Boolean(isActive)
    : (isActive ? 1 : 0)
);

const normalizeUserPayload = (payload = {}) => {
  const role = normalizeOptionalText(payload.role);
  const isStudentRole = role === 'student';

  return {
    email: normalizeOptionalText(payload.email),
    password: payload.password,
    name: normalizeOptionalText(payload.name),
    role,
    student_id: isStudentRole ? normalizeOptionalText(payload.student_id) : null,
    group_name: isStudentRole ? normalizeOptionalText(payload.group_name) : null,
    subgroup_name: isStudentRole ? normalizeOptionalText(payload.subgroup_name) : null,
    phone: normalizeOptionalText(payload.phone),
    avatar: normalizeOptionalText(payload.avatar),
    date_of_birth: normalizeOptionalText(payload.date_of_birth),
    faculty: normalizeOptionalText(payload.faculty),
    major: normalizeOptionalText(payload.major),
    year_of_study: normalizeOptionalInteger(payload.year_of_study),
    address: normalizeOptionalText(payload.address),
    emergency_contact: normalizeOptionalText(payload.emergency_contact),
    father_name: normalizeOptionalText(payload.father_name),
    program_class: normalizeOptionalText(payload.program_class),
    advisor: normalizeOptionalText(payload.advisor),
    study_status: normalizeOptionalText(payload.study_status),
    balance_info: normalizeOptionalText(payload.balance_info),
    grant_type: normalizeOptionalText(payload.grant_type),
    registration_date: normalizeOptionalText(payload.registration_date)
  };
};

router.get('/profile/me', auth, async (req, res) => {
  try {
    const user = await db.get(
      `SELECT ${PROFILE_FIELDS} FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/profile/me', auth, async (req, res) => {
  try {
    const {
      name,
      group_name,
      subgroup_name,
      phone,
      avatar,
      date_of_birth,
      faculty,
      major,
      year_of_study,
      address,
      emergency_contact,
      father_name,
      program_class,
      advisor,
      study_status,
      balance_info,
      grant_type,
      registration_date
    } = normalizeUserPayload({
      ...req.body,
      role: req.user.role
    });

    await db.run(
      `UPDATE users
       SET name = ?,
           group_name = ?,
           subgroup_name = ?,
           phone = ?,
           avatar = ?,
           date_of_birth = ?,
           faculty = ?,
           major = ?,
           year_of_study = ?,
           address = ?,
           emergency_contact = ?,
           father_name = ?,
           program_class = ?,
           advisor = ?,
           study_status = ?,
           balance_info = ?,
           grant_type = ?,
           registration_date = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        name,
        group_name,
        subgroup_name,
        phone,
        avatar,
        date_of_birth,
        faculty,
        major,
        year_of_study,
        address,
        emergency_contact,
        father_name,
        program_class,
        advisor,
        study_status,
        balance_info,
        grant_type,
        registration_date,
        req.user.id
      ]
    );

    const user = await db.get(
      `SELECT ${PROFILE_FIELDS} FROM users WHERE id = ?`,
      [req.user.id]
    );

    res.json({ message: 'Profile updated', user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', auth, isAdmin, async (req, res) => {
  try {
    const users = await db.all(
      `SELECT ${PROFILE_FIELDS} FROM users ORDER BY created_at DESC`
    );
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', auth, isAdmin, async (req, res) => {
  try {
    const {
      email,
      password,
      name,
      role,
      student_id,
      group_name,
      subgroup_name,
      phone,
      date_of_birth,
      faculty,
      major,
      year_of_study,
      address,
      emergency_contact,
      father_name,
      program_class,
      advisor,
      study_status,
      balance_info,
      grant_type,
      registration_date
    } = normalizeUserPayload(req.body);

    if (!email || !password || !name || !role) {
      return res.status(400).json({ error: 'Name, email, password, and role are required' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await db.run(
      `INSERT INTO users (
        email, password, name, role, student_id, group_name, subgroup_name, phone,
        date_of_birth, faculty, major, year_of_study, address, emergency_contact,
        father_name, program_class, advisor, study_status, balance_info, grant_type, registration_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        email,
        hashedPassword,
        name,
        role,
        student_id,
        group_name,
        subgroup_name,
        phone,
        date_of_birth,
        faculty,
        major,
        year_of_study,
        address,
        emergency_contact,
        father_name,
        program_class,
        advisor,
        study_status,
        balance_info,
        grant_type,
        registration_date
      ]
    );

    const user = await db.get(
      `SELECT ${PROFILE_FIELDS} FROM users WHERE id = ?`,
      [result.id]
    );

    res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    console.error('Create user error:', error);
    if (
      error.message.includes('UNIQUE constraint failed')
      || error.message.includes('duplicate key value violates unique constraint')
    ) {
      return res.status(400).json({ error: 'Email or student ID already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/bulk/preview', auth, isAdmin, async (req, res) => {
  try {
    const preview = await previewBulkUserImport(req.body?.csvText);
    res.json(preview);
  } catch (error) {
    console.error('Bulk user preview error:', error);
    res.status(400).json({ error: error.message || 'Bulk preview failed' });
  }
});

router.post('/bulk/apply', auth, isAdmin, async (req, res) => {
  try {
    const result = await applyBulkUserImport(req.body?.csvText);
    res.status(201).json(result);
  } catch (error) {
    console.error('Bulk user apply error:', error);
    const statusCode = error.message?.includes('Paste CSV') || error.message?.includes('header row')
      ? 400
      : 500;
    res.status(statusCode).json({ error: error.message || 'Bulk import failed' });
  }
});

router.patch('/:id/status', auth, isAdmin, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: 'Valid user ID is required' });
    }

    if (req.user.id === userId) {
      return res.status(400).json({ error: 'You cannot disable or restore your own account from this screen' });
    }

    if (typeof req.body?.is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active boolean is required' });
    }

    const targetUser = await db.get(
      `SELECT ${PROFILE_FIELDS} FROM users WHERE id = ?`,
      [userId]
    );

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.is_superadmin) {
      return res.status(403).json({ error: 'Super admin accounts cannot be disabled from the admin workspace' });
    }

    if (targetUser.role === 'admin' && !hasSuperadminAccess(req.user)) {
      return res.status(403).json({ error: 'Only a super admin can change another admin account status' });
    }

    await db.run(
      'UPDATE users SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [toActiveDatabaseValue(req.body.is_active), userId]
    );

    const updatedUser = await db.get(
      `SELECT ${PROFILE_FIELDS} FROM users WHERE id = ?`,
      [userId]
    );

    res.json({
      message: req.body.is_active ? 'Account restored successfully' : 'Account disabled successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    if (!hasAdminAccess(req.user) && req.user.id !== Number(req.params.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const user = await db.get(
      `SELECT ${PROFILE_FIELDS} FROM users WHERE id = ?`,
      [req.params.id]
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', auth, async (req, res) => {
  try {
    if (!hasAdminAccess(req.user) && req.user.id !== Number(req.params.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const existingUser = await db.get(
      'SELECT role FROM users WHERE id = ?',
      [req.params.id]
    );

    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    const {
      name,
      group_name,
      subgroup_name,
      phone,
      avatar,
      date_of_birth,
      faculty,
      major,
      year_of_study,
      address,
      emergency_contact,
      father_name,
      program_class,
      advisor,
      study_status,
      balance_info,
      grant_type,
      registration_date
    } = normalizeUserPayload({
      ...req.body,
      role: existingUser.role
    });

    await db.run(
      `UPDATE users
       SET name = ?,
           group_name = ?,
           subgroup_name = ?,
           phone = ?,
           avatar = ?,
           date_of_birth = ?,
           faculty = ?,
           major = ?,
           year_of_study = ?,
           address = ?,
           emergency_contact = ?,
           father_name = ?,
           program_class = ?,
           advisor = ?,
           study_status = ?,
           balance_info = ?,
           grant_type = ?,
           registration_date = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        name,
        group_name,
        subgroup_name,
        phone,
        avatar,
        date_of_birth,
        faculty,
        major,
        year_of_study,
        address,
        emergency_contact,
        father_name,
        program_class,
        advisor,
        study_status,
        balance_info,
        grant_type,
        registration_date,
        req.params.id
      ]
    );

    const user = await db.get(
      `SELECT ${PROFILE_FIELDS} FROM users WHERE id = ?`,
      [req.params.id]
    );

    res.json({ message: 'Profile updated', user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
