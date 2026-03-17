const express = require('express');
const router = express.Router();
const { auth, isAdmin } = require('../middleware/auth');
const db = require('../config/database');

// Get all users (admin only)
router.get('/', auth, isAdmin, async (req, res) => {
  try {
    const users = await db.all(
      'SELECT id, email, name, role, student_id, group_name, phone, is_active, created_at FROM users ORDER BY created_at DESC'
    );
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user profile
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await db.get(
      'SELECT id, email, name, role, student_id, group_name, phone, avatar FROM users WHERE id = ?',
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

// Update user profile
router.put('/:id', auth, async (req, res) => {
  try {
    // Users can only update their own profile (unless admin)
    if (req.user.role !== 'admin' && req.user.id !== parseInt(req.params.id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { name, phone, avatar } = req.body;

    await db.run(
      'UPDATE users SET name = ?, phone = ?, avatar = ? WHERE id = ?',
      [name, phone, avatar, req.params.id]
    );

    const user = await db.get(
      'SELECT id, name, phone, avatar FROM users WHERE id = ?',
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
    res.json({
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role,
        studentId: req.user.student_id,
        groupName: req.user.group_name,
        phone: req.user.phone,
        avatar: req.user.avatar
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
