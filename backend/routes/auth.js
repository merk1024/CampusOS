const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { auth } = require('../middleware/auth');

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register',
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

      const { email, password, name, role, studentId, groupName, phone } = req.body;

      // Check if user exists
      const existingUser = await db.get('SELECT id FROM users WHERE email = ?', [email]);

      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }

      // Check if student_id exists (for students)
      if (role === 'student' && studentId) {
        const existingStudentId = await db.get('SELECT id FROM users WHERE student_id = ?', [studentId]);
        if (existingStudentId) {
          return res.status(400).json({ error: 'Student ID already exists' });
        }
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      // Insert user
      await db.run(
        `INSERT INTO users (email, password, name, role, student_id, group_name, phone)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [email, hashedPassword, name, role, studentId || null, groupName || null, phone || null]
      );

      // Get the inserted user
      const user = await db.get('SELECT id, email, name, role, student_id, group_name FROM users WHERE email = ?', [email]);

      // Generate JWT
      const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      res.status(201).json({
        message: 'User registered successfully',
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          studentId: user.student_id,
          groupName: user.group_name
        }
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login',
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

      // Find user by email or student_id
      const user = await db.get(
        'SELECT * FROM users WHERE email = ? OR student_id = ?',
        [login, login]
      );

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check if user is active
      if (!user.is_active) {
        return res.status(403).json({ error: 'Account is disabled' });
      }

      // Verify password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Generate JWT
      const token = jwt.sign(
        { id: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      res.json({
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          studentId: user.student_id,
          groupName: user.group_name,
          phone: user.phone,
          avatar: user.avatar
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, email, name, role, student_id, group_name, phone, avatar FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/auth/password
// @desc    Change password
// @access  Private
router.put('/password',
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

      // Get current password
      const result = await db.query(
        'SELECT password FROM users WHERE id = $1',
        [req.user.id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify current password
      const isMatch = await bcrypt.compare(currentPassword, result.rows[0].password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }

      // Hash new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Update password
      await db.query(
        'UPDATE users SET password = $1 WHERE id = $2',
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
