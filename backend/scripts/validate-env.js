const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const backendRoot = path.resolve(__dirname, '..');

const parseArgs = (argv) => argv.reduce((result, entry) => {
  if (!entry.startsWith('--')) {
    return result;
  }

  const [rawKey, ...rest] = entry.slice(2).split('=');
  const key = rawKey.trim();
  const value = rest.length > 0 ? rest.join('=').trim() : 'true';
  result[key] = value;
  return result;
}, {});

const args = parseArgs(process.argv.slice(2));

const normalizeMode = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'production') return 'production';
  if (normalized === 'staging') return 'staging';
  return 'development';
};

const envFileArg = args['env-file'];
const envFilePath = envFileArg
  ? path.resolve(backendRoot, envFileArg)
  : path.resolve(backendRoot, '.env');

if (fs.existsSync(envFilePath)) {
  dotenv.config({ path: envFilePath, override: true });
}

const mode = normalizeMode(args.mode || process.env.APP_ENV || process.env.NODE_ENV);

const read = (key) => String(process.env[key] || '').trim();
const hasValue = (key) => read(key).length > 0;
const isPlaceholder = (value) => (
  !value
  || /change_me|replace_with|your_|password_here|example|localhost:5432\/campusos_staging/i.test(value)
);

const errors = [];
const warnings = [];

const requireValue = (key, message) => {
  if (!hasValue(key)) {
    errors.push(message || `${key} is required.`);
  }
};

const requireNonPlaceholder = (key, message) => {
  if (isPlaceholder(read(key))) {
    errors.push(message || `${key} must be set to a real non-placeholder value.`);
  }
};

const dbClient = read('DB_CLIENT') || (hasValue('DATABASE_URL') ? 'postgres' : 'sqlite');

requireValue('FRONTEND_URL', 'FRONTEND_URL is required so the API can allow the correct frontend origin.');
requireNonPlaceholder('JWT_SECRET', 'JWT_SECRET must be a real secret and not the default placeholder.');

if (dbClient === 'postgres') {
  requireValue('DATABASE_URL', 'DATABASE_URL is required when DB_CLIENT=postgres.');

  if (mode !== 'development' && !hasValue('PGSSLMODE') && !hasValue('PGSSL_REJECT_UNAUTHORIZED') && !hasValue('PGSSL_ALLOW_SELF_SIGNED')) {
    warnings.push('No explicit PostgreSQL SSL policy is set. Define PGSSLMODE, PGSSL_REJECT_UNAUTHORIZED, or PGSSL_ALLOW_SELF_SIGNED for predictable deploys.');
  }
} else if (dbClient !== 'sqlite') {
  errors.push(`Unsupported DB_CLIENT "${dbClient}". Use sqlite or postgres.`);
}

if (mode === 'development') {
  requireValue('DB_CLIENT', 'DB_CLIENT should be set explicitly in local development.');
} else {
  if (read('NODE_ENV') !== 'production') {
    errors.push('NODE_ENV must be set to production for staging and production deployments.');
  }

  if (dbClient !== 'postgres') {
    errors.push(`${mode} requires DB_CLIENT=postgres.`);
  }

  requireValue('SUPERADMIN_EMAIL', 'SUPERADMIN_EMAIL is required for bootstrap owner access.');
  requireValue('SUPERADMIN_NAME', 'SUPERADMIN_NAME is required for bootstrap owner access.');
  requireNonPlaceholder('SUPERADMIN_BOOTSTRAP_PASSWORD', 'SUPERADMIN_BOOTSTRAP_PASSWORD must be set before deploying.');
  requireNonPlaceholder('SEED_ADMIN_PASSWORD', 'SEED_ADMIN_PASSWORD must be set before deploying.');
  requireNonPlaceholder('SEED_TEACHER_PASSWORD', 'SEED_TEACHER_PASSWORD must be set before deploying.');
  requireNonPlaceholder('SEED_STUDENT_PASSWORD', 'SEED_STUDENT_PASSWORD must be set before deploying.');

  if (!/^https:\/\//i.test(read('FRONTEND_URL'))) {
    warnings.push('FRONTEND_URL should usually use https:// outside local development.');
  }
}

console.log(`CampusOS environment check (${mode})`);
console.log(`Environment source: ${fs.existsSync(envFilePath) ? envFilePath : 'process.env only'}`);
console.log(`Database client: ${dbClient}`);

if (warnings.length) {
  console.log('\nWarnings:');
  warnings.forEach((warning) => console.log(`- ${warning}`));
}

if (errors.length) {
  console.log('\nErrors:');
  errors.forEach((error) => console.log(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log('\nEnvironment looks ready for this mode.');
}
