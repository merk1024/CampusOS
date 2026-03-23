const express = require('express');
const bcrypt = require('bcryptjs');

const router = express.Router();
const { auth, isAdmin } = require('../middleware/auth');
const db = require('../config/database');
const { hasAdminAccess } = require('../utils/access');

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
  is_superadmin,
  last_login_at,
  last_login_ip,
  registration_date,
  created_at
`;

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
    } = req.body;

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
    } = req.body;

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
    } = req.body;

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
