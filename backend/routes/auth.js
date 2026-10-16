const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const router = express.Router();
const db = require('../config/database');
const { auth } = require('../middleware/auth');
const { validatePassword } = require('../utils/passwordPolicy');
const {
  AUTH_COOKIE_NAME,
  buildAuthCookieOptions,
  shouldExposeTokenResponse
} = require('../utils/authCookies');
const { logSystemAudit } = require('../utils/platformOps');

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
  is_active,
  date_of_birth,
  registration_date,
  is_superadmin,
  last_login_at,
  last_login_ip
`;

// Accounts are provisioned through the audited admin-only /api/users flow.
router.post('/register', (req, res) => {
  res.status(403).json({ error: 'Self-registration is disabled. Contact your administrator.' });
});

router.post(
  '/login',
  [
    body('login').trim().notEmpty(),
    body('password').isString().notEmpty(),
    body('rememberMe').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { login, password, rememberMe } = req.body;

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
        { id: freshUser.id, role: freshUser.role, sessionVersion: Number(user.session_version) },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      res.cookie(
        AUTH_COOKIE_NAME,
        token,
        buildAuthCookieOptions({ rememberMe: Boolean(rememberMe) })
      );

      await logSystemAudit({
        entityType: 'auth',
        entityId: freshUser.id,
        action: 'login',
        summary: `${freshUser.email} signed in`,
        details: {
          rememberMe: Boolean(rememberMe),
          role: freshUser.role,
          loginIp: clientIp
        },
        changedBy: freshUser.id,
        requestId: req.requestId
      });

      const payload = {
        message: 'Login successful',
        user: {
          ...freshUser,
          isSuperadmin: Number(freshUser.is_superadmin || 0) === 1,
          studentId: freshUser.student_id,
          groupName: freshUser.group_name,
          subgroupName: freshUser.subgroup_name
        }
      };

      if (shouldExposeTokenResponse()) {
        payload.token = token;
      }

      res.json(payload);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

router.post('/logout', auth, async (req, res) => {
  try {
    await db.transaction(async (tx) => {
    await tx.run('UPDATE users SET session_version = session_version + 1 WHERE id = ?', [req.user.id]);
    await logSystemAudit({
      entityType: 'auth',
      entityId: req.user.id,
      action: 'logout',
      summary: `${req.user.email} signed out`,
      details: {
        role: req.user.role
      },
      changedBy: req.user.id,
      requestId: req.requestId
    }, tx);
    });
    res.clearCookie(AUTH_COOKIE_NAME, buildAuthCookieOptions({ clear: true }));

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Server error' });
  }
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
    body('currentPassword').isString().notEmpty(),
    body('newPassword').custom(validatePassword)
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

      const changed = await db.transaction(async (tx) => {
        const result = await tx.run(
          'UPDATE users SET password = ?, session_version = session_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND password = ? AND session_version = ?',
          [hashedPassword, req.user.id, user.password, req.user.session_version]
        );
        if (result.changes !== 1) return false;
        await logSystemAudit({
          entityType: 'auth',
          entityId: req.user.id,
          action: 'password-change',
          summary: `${req.user.email} updated the account password`,
          changedBy: req.user.id,
          requestId: req.requestId
        }, tx);
        return true;
      });
      if (!changed) return res.status(401).json({ error: 'Session expired. Please sign in again.' });
      res.clearCookie(AUTH_COOKIE_NAME, buildAuthCookieOptions({ clear: true }));

      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: 'Server error' });
    }
  }
);

module.exports = router;
