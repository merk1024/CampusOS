const validatePassword = (password) => {
  if (typeof password !== 'string' || Array.from(password).length < 12) {
    throw new Error('Password must contain at least 12 characters');
  }
  if (Buffer.byteLength(password, 'utf8') > 72) {
    throw new Error('Password must not exceed 72 UTF-8 bytes');
  }
  return true;
};

module.exports = { validatePassword };
