const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const router = express.Router();
const db = require('../config/database');
const { auth } = require('../middleware/auth');

const AUTH_USER_FIELDS = `
  id,
  email,
  name,
  role,
  student_id,
  group_name,
  subgroup_name,
  phone,
  avatar,
  father_name,
  program_class,
  advisor,
  study_status,
  balance_info,
  grant_type,
  date_of_birth,
  registration_date,
  last_login_at,
  last_login_ip
`;

router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').trim().notEmpty(),
    body('role').isIn(['student', 'teacher', 'admin'])
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, name, role, studentId, groupName, subgroupName, phone } = req.body;

      const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      if (role === 'student' && studentId) {
        const existingStudentId = await db.get('SELECT id FROM users WHERE student_id = ?', [studentId]);
        if (existingStudentId) {
          return res.status(400).json({ error: 'Student ID already exists' });
        }
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      await db.run(
        `INSERT INTO users (email, password, name, role, student_id, group_name, subgroup_name, phone)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [email, hashedPassword, name, role, studentId || null, groupName || null, subgroupName || null, phone || null]
      );

      const user = await db.get(
        `SELECT ${AUTH_USER_FIELDS} FROM users WHERE email = ?`,
        [email]
      );

      const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      res.status(201).json({
        message: 'User registered successfully',
        token,
        user
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

router.post(
  '/login',
  [
    body('login').trim().notEmpty(),
    body('password').notEmpty()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { login, password } = req.body;

      const user = await db.get(
        'SELECT * FROM users WHERE email = ? OR student_id = ?',
        [login, login]
      );

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (!user.is_active) {
        return res.status(403).json({ error: 'Account is disabled' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const now = new Date().toISOString();
      const clientIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null;

      await db.run(
        'UPDATE users SET last_login_at = ?, last_login_ip = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [now, clientIp, user.id]
      );

      const freshUser = await db.get(
        `SELECT ${AUTH_USER_FIELDS} FROM users WHERE id = ?`,
        [user.id]
      );

      const token = jwt.sign(
        { id: freshUser.id, role: freshUser.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: {
          ...freshUser,
          studentId: freshUser.student_id,
          groupName: freshUser.group_name,
          subgroupName: freshUser.subgroup_name
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

router.post('/logout', auth, async (req, res) => {
  res.json({ message: 'Logout successful' });
});

router.get('/me', auth, async (req, res) => {
  try {
    const user = await db.get(
      `SELECT ${AUTH_USER_FIELDS} FROM users WHERE id = ?`,
      [req.user.id]
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

router.put(
  '/password',
  auth,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { currentPassword, newPassword } = req.body;

      const user = await db.get(
        'SELECT password FROM users WHERE id = ?',
        [req.user.id]
      );

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      await db.run(
        'UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [hashedPassword, req.user.id]
      );

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

module.exports = router;
