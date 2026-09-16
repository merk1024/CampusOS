const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const envPath = path.join(__dirname, '..', '.env');
const secret = () => randomBytes(32).toString('hex');
if (fs.existsSync(envPath)) {
  console.error('backend/.env already exists; preserved it. See docs/POSTGRESQL.md.');
  process.exitCode = 1;
} else {
  const password = secret();
  let contents = fs.readFileSync(envPath + '.example', 'utf8');
  const values = {
    DB_CLIENT: 'postgres', DB_HOST: '127.0.0.1', DB_PORT: '5432',
    DB_NAME: 'campusos', DB_USER: 'campusos', DB_PASSWORD: password,
    DATABASE_URL: 'postgresql://campusos:' + password + '@127.0.0.1:5432/campusos',
    PGSSLMODE: 'disable', JWT_SECRET: secret(),
    SUPERADMIN_BOOTSTRAP_PASSWORD: secret()
  };
  for (const [key, value] of Object.entries(values)) {
    contents = contents.replace(new RegExp('^' + key + '=.*$', 'm'), key + '=' + value);
  }
  fs.writeFileSync(envPath, contents, { flag: 'wx', mode: 0o600 });
  console.log('Created backend/.env with generated local PostgreSQL credentials. Keep it private.');
}
