const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { SUPERADMIN_EMAIL } = require('../utils/access');
const ACTIVE_STATUS = db.client === 'postgres' ? true : 1;

const USERS = [
  {
    email: process.env.SUPERADMIN_EMAIL || SUPERADMIN_EMAIL,
    password: process.env.SUPERADMIN_BOOTSTRAP_PASSWORD || 'ChangeMe123!',
    name: process.env.SUPERADMIN_NAME || 'Erbol Abdusatov',
    role: 'admin',
    avatar: 'EA',
    is_superadmin: 1
  },
  {
    student_id: '240141052',
    email: 'erbol.abdusaitov1@alatoo.edu.kg',
    password: 'student',
    name: 'Erbol Abdusaitov',
    role: 'student',
    group_name: 'CYB-23',
    subgroup_name: '1-Group',
    avatar: 'EA'
  },
  {
    email: 'teacher@alatoo.edu.kg',
    password: 'teacher',
    name: 'Azhar Kazakbaeva',
    role: 'teacher',
    avatar: 'AK'
  },
  {
    email: 'admin@alatoo.edu.kg',
    password: 'admin',
    name: 'Admin User',
    role: 'admin',
    avatar: 'AU'
  }
];

async function findUserByEmail(email) {
  return db.get('SELECT * FROM users WHERE email = ?', [email]);
}

async function ensureUser(user, hashedPassword) {
  const existing = await findUserByEmail(user.email);
  if (existing) {
    if (user.is_superadmin) {
      await db.run(
        `UPDATE users
         SET name = COALESCE(name, ?),
             role = ?,
             avatar = COALESCE(avatar, ?),
             is_superadmin = 1,
             is_active = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [user.name, 'admin', user.avatar || null, ACTIVE_STATUS, existing.id]
      );

      return findUserByEmail(user.email);
    }

    return existing;
  }

  await db.run(
    `INSERT INTO users (
      student_id, email, password, name, role, group_name, subgroup_name, avatar, is_superadmin
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      user.student_id || null,
      user.email,
      hashedPassword,
      user.name,
      user.role,
      user.group_name || null,
      user.subgroup_name || null,
      user.avatar || null,
      user.is_superadmin || 0
    ]
  );

  return findUserByEmail(user.email);
}

async function seed() {
  try {
    console.log('Starting account seeding...');
    await db.migrate();

    const salt = await bcrypt.genSalt(10);

    for (const user of USERS) {
      const hashedPassword = await bcrypt.hash(user.password, salt);
      await ensureUser(user, hashedPassword);
    }

    console.log('Account seeding completed successfully.');
    console.log('');
    console.log('Available accounts:');
    console.log(`  Super:   ${process.env.SUPERADMIN_EMAIL || SUPERADMIN_EMAIL} / ${process.env.SUPERADMIN_BOOTSTRAP_PASSWORD || 'ChangeMe123!'}`);
    console.log('  Student: erbol.abdusaitov1@alatoo.edu.kg / student');
    console.log('  Teacher: teacher@alatoo.edu.kg / teacher');
    console.log('  Admin:   admin@alatoo.edu.kg / admin');
  } catch (error) {
    console.error('Error seeding accounts:', error);
    throw error;
  }
}

if (require.main === module) {
  seed()
    .then(() => {
      console.log('Seeding complete.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = seed;
