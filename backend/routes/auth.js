const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');

const router = express.Router();
const db = require('../config/database');
const { auth } = require('../middleware/auth');
const { validatePassword } = require('../utils/passwordPolicy');
const {
  AUTH_COOKIE_NAME,
  buildAuthCookieOptions
} = require('../utils/authCookies');
const { logSystemAudit } = require('../utils/platformOps');
const { issueSession } = require('../utils/authSession');
router.use('/mfa', require('./mfa'));

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
        await logSystemAudit({ entityType: 'auth', action: 'login-failed', summary: 'Unknown account login rejected', requestId: req.requestId });
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (!user.is_active) {
        await logSystemAudit({ entityType: 'auth', action: 'login-blocked', summary: 'Inactive account login rejected', changedBy: user.id, requestId: req.requestId });
        return res.status(403).json({ error: 'Account is disabled' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        await logSystemAudit({ entityType: 'auth', action: 'login-failed', summary: 'Account login rejected', changedBy: user.id, requestId: req.requestId });
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const challenge = await require('../services/mfaService').createLoginChallenge(user, Boolean(rememberMe));
      if (challenge?.error) return res.status(challenge.status).json({ error: challenge.error });
      if (challenge) return res.set('Cache-Control', 'no-store').json(challenge);
      await issueSession(req, res, user, Boolean(rememberMe));
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
