const express = require('express');
const rateLimit = require('express-rate-limit');
const { auth } = require('../middleware/auth');
const service = require('../services/mfaService');
const { issueSession } = require('../utils/authSession');
const { AUTH_COOKIE_NAME, buildAuthCookieOptions } = require('../utils/authCookies');
const router = express.Router();
router.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.use(rateLimit({ windowMs: 15 * 60000, limit: process.env.NODE_ENV === 'test' ? 1000 : 30,
  message: { error: 'Too many MFA attempts. Try again later.' } }));
const setupAuth = (req, res, next) => typeof req.body?.challenge === 'string' ? next() : auth(req, res, next);
const respond = (handler) => async (req, res) => {
  try {
    const result = await handler(req);
    if (result.error) return res.status(result.status).json({ error: result.error });
    if (result.signedOut) res.clearCookie(AUTH_COOKIE_NAME, buildAuthCookieOptions({ clear: true }));
    res.json(result);
  } catch {
    // Never print input, provisioning credentials or cryptographic exceptions.
    res.status(503).json({ error: 'MFA is temporarily unavailable' });
  }
};
router.get('/status', auth, respond(req => service.getMfaStatus(req.user)));
router.post('/enroll', setupAuth, respond(req => service.beginEnrollment(req.body, req.user, req.requestId)));
router.post('/confirm', setupAuth, respond(req => service.confirmEnrollment(req.body, req.user, req.requestId)));
router.post('/verify', async (req, res) => {
  try {
    const result = await service.verifyLoginChallenge(req.body, req.requestId);
    if (result.error) return res.status(result.status).json({ error: result.error });
    await issueSession(req, res, result.user, result.rememberMe, true);
  } catch { res.status(503).json({ error: 'MFA is temporarily unavailable' }); }
});
for (const operation of ['regenerate', 'disable', 'reset']) {
  router.post('/' + operation, auth, respond(req => service.manageMfa(operation, req.body, req.user, req.requestId)));
}
module.exports = router;
