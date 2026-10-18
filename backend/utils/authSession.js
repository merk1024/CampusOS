const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { AUTH_COOKIE_NAME, buildAuthCookieOptions, shouldExposeTokenResponse } = require('./authCookies');
const { logSystemAudit } = require('./platformOps');

const fields = `id, email, name, role, student_id, group_name, subgroup_name, phone, avatar,
  father_name, program_class, advisor, study_status, balance_info, grant_type, is_active,
  date_of_birth, registration_date, is_superadmin, last_login_at, last_login_ip`;

async function issueSession(req, res, user, rememberMe, mfaVerified = false) {
  const clientIp = req.ip || null;
  const freshUser = await db.transaction(async tx => {
    const changed = await tx.run('UPDATE users SET last_login_at = ?, last_login_ip = ? WHERE id = ? AND session_version = ?',
      [new Date().toISOString(), clientIp, user.id, user.session_version]);
    if (changed.changes !== 1) return null;
    const fresh = await tx.get(`SELECT ${fields} FROM users WHERE id = ?`, [user.id]);
    if (!fresh.is_active) return null;
    await logSystemAudit({ entityType: 'auth', entityId: user.id, action: 'login', summary: `${fresh.email} signed in`,
      details: { rememberMe, role: fresh.role, loginIp: clientIp, mfaVerified }, changedBy: user.id, requestId: req.requestId }, tx);
    return fresh;
  });
  if (!freshUser) return res.status(401).json({ error: 'Session expired. Please sign in again.' });
  const token = jwt.sign({ id: user.id, role: freshUser.role, sessionVersion: Number(user.session_version), mfaVerified },
    process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });
  res.cookie(AUTH_COOKIE_NAME, token, buildAuthCookieOptions({ rememberMe }));
  const payload = { message: 'Login successful', user: { ...freshUser, isSuperadmin: Number(freshUser.is_superadmin || 0) === 1,
    studentId: freshUser.student_id, groupName: freshUser.group_name, subgroupName: freshUser.subgroup_name } };
  if (shouldExposeTokenResponse()) payload.token = token;
  res.set('Cache-Control', 'no-store').json(payload);
}

module.exports = { issueSession };
