const AUTH_COOKIE_NAME = 'campusos_session';
const DEFAULT_REMEMBER_DAYS = 30;

const readBooleanEnv = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return null;
};

const normalizeSameSite = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (['lax', 'strict', 'none'].includes(normalized)) {
    return normalized;
  }

  return null;
};

const isProduction = () => (
  String(process.env.NODE_ENV || '').trim().toLowerCase() === 'production'
);

const getCookieSecureFlag = () => {
  const explicit = readBooleanEnv(process.env.AUTH_COOKIE_SECURE);
  if (explicit !== null) {
    return explicit;
  }

  return isProduction();
};

const getCookieSameSite = (secureCookie) => {
  const explicit = normalizeSameSite(process.env.AUTH_COOKIE_SAMESITE);
  if (explicit) {
    return explicit;
  }

  return secureCookie ? 'none' : 'lax';
};

const getCookieMaxAgeMs = () => {
  const parsedDays = Number(process.env.AUTH_COOKIE_MAX_AGE_DAYS || DEFAULT_REMEMBER_DAYS);
  const safeDays = Number.isFinite(parsedDays) && parsedDays > 0 ? parsedDays : DEFAULT_REMEMBER_DAYS;
  return safeDays * 24 * 60 * 60 * 1000;
};

const buildAuthCookieOptions = ({ rememberMe = false, clear = false } = {}) => {
  const secure = getCookieSecureFlag();
  const sameSite = getCookieSameSite(secure);

  const options = {
    httpOnly: true,
    secure,
    sameSite,
    path: '/'
  };

  const cookieDomain = String(process.env.AUTH_COOKIE_DOMAIN || '').trim();
  if (cookieDomain) {
    options.domain = cookieDomain;
  }

  if (!clear && rememberMe) {
    options.maxAge = getCookieMaxAgeMs();
  }

  return options;
};

const getTokenFromRequest = (req) => {
  const authorizationToken = req.header('Authorization')?.replace('Bearer ', '').trim();
  if (authorizationToken) {
    return authorizationToken;
  }

  return req.cookies?.[AUTH_COOKIE_NAME] || null;
};

const shouldExposeTokenResponse = () => (
  String(process.env.NODE_ENV || '').trim().toLowerCase() === 'test'
  || readBooleanEnv(process.env.AUTH_EXPOSE_TOKEN_RESPONSE) === true
);

module.exports = {
  AUTH_COOKIE_NAME,
  buildAuthCookieOptions,
  getTokenFromRequest,
  shouldExposeTokenResponse
};
