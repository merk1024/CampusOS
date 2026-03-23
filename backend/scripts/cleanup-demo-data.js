const db = require('../config/database');

const TABLES_TO_CLEAR = [
  'attendance',
  'assignment_submissions',
  'assignments',
  'announcements',
  'grades',
  'exam_students',
  'exams',
  'schedule',
  'course_enrollments',
  'courses'
];

async function cleanupDemoData() {
  try {
    console.log('Removing demo and temporary data...');
    await db.migrate();

    for (const tableName of TABLES_TO_CLEAR) {
      await db.run(`DELETE FROM ${tableName}`);
    }

    await db.query(`
      UPDATE users
      SET
        date_of_birth = CASE WHEN date_of_birth = '2005-12-25' THEN NULL ELSE date_of_birth END,
        faculty = CASE WHEN faculty = 'Faculty of Engineering and Informatics' THEN NULL ELSE faculty END,
        major = CASE WHEN major = 'Cybersecurity and Ethical Hacking' THEN NULL ELSE major END,
        father_name = CASE WHEN father_name = 'Iliiaz' THEN NULL ELSE father_name END,
        program_class = CASE
          WHEN program_class = 'Cybersecurity and Ethical Hacking - Bcl.-EN - 3' THEN NULL
          ELSE program_class
        END,
        advisor = CASE WHEN advisor = 'Nuraiym Kuletova' THEN NULL ELSE advisor END,
        balance_info = CASE
          WHEN balance_info = 'No debt [ 1.33 USD advance payment ]' THEN NULL
          ELSE balance_info
        END,
        grant_type = CASE WHEN grant_type = 'Not available' THEN NULL ELSE grant_type END,
        registration_date = CASE WHEN registration_date = '2024-08-15' THEN NULL ELSE registration_date END,
        last_login_ip = CASE WHEN last_login_ip = '192.168.11.35' THEN NULL ELSE last_login_ip END
    `);

    console.log('Demo and temporary data removed successfully.');
    console.log('User accounts were preserved.');
  } catch (error) {
    console.error('Failed to remove demo data:', error);
    throw error;
  }
}

if (require.main === module) {
  cleanupDemoData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = cleanupDemoData;
