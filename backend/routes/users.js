const express = require('express');
const router = express.Router();
const { auth, isAdmin } = require('../middleware/auth');
const db = require('../config/database');

// Create user (admin only)
router.post('/', auth, isAdmin, async (req, res) => {
  try {
    const { email, password, name, role, student_id, group_name, phone, date_of_birth, faculty, major, year_of_study, address, emergency_contact } = req.body;

    // Hash password
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await db.run(
      'INSERT INTO users (email, password, name, role, student_id, group_name, phone, date_of_birth, faculty, major, year_of_study, address, emergency_contact) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [email, hashedPassword, name, role, student_id, group_name, phone, date_of_birth, faculty, major, year_of_study, address, emergency_contact]
    );

    const user = await db.get(
      'SELECT id, email, name, role, student_id, group_name, phone, date_of_birth, faculty, major, year_of_study, address, emergency_contact FROM users WHERE id = ?',
      [result.lastID]
    );

    res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    console.error('Create user error:', error);
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'Email or student ID already exists' });
    } else {
      res.status(500).json({ error: 'Server error' });
    }
  }
});

// Get user profile (extended)
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await db.get(
      'SELECT id, email, name, role, student_id, group_name, phone, avatar, date_of_birth, faculty, major, year_of_study, address, emergency_contact FROM users WHERE id = ?',
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

// Update user profile (extended)
router.put('/:id', auth, async (req, res) => {
  try {
    // Users can only update their own profile (unless admin)
    if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { name, phone, avatar, date_of_birth, faculty, major, year_of_study, address, emergency_contact } = req.body;

    await db.run(
      'UPDATE users SET name = ?, phone = ?, avatar = ?, date_of_birth = ?, faculty = ?, major = ?, year_of_study = ?, address = ?, emergency_contact = ? WHERE id = ?',
      [name, phone, avatar, date_of_birth, faculty, major, year_of_study, address, emergency_contact, req.params.id]
    );

    const user = await db.get(
      'SELECT id, name, phone, avatar, date_of_birth, faculty, major, year_of_study, address, emergency_contact FROM users WHERE id = ?',
      [req.params.id]
    );

    res.json({ message: 'Profile updated', user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get current user profile
router.get('/profile/me', auth, async (req, res) => {
  try {
    const user = await db.get(
      'SELECT id, email, name, role, student_id, group_name, phone, avatar, date_of_birth, faculty, major, year_of_study, address, emergency_contact FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json({ user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
