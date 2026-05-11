const db = require('../config/database');
const { SUPERADMIN_EMAIL } = require('../utils/access');
const {
  seedAssignments,
  seedAttendance,
  seedCourses,
  seedEnrollments,
  seedExams,
  seedGrades,
  seedSchedule,
  seedUsers
} = require('./seedOperations');

async function seed() {
  try {
    console.log('Starting CampusOS pilot seed...');
    await db.migrate();

    const usersByEmail = await seedUsers();
    const coursesByCode = await seedCourses(usersByEmail);
    await seedEnrollments(usersByEmail, coursesByCode);
    const scheduleByBlueprintKey = await seedSchedule(usersByEmail, coursesByCode);
    const assignmentsByTitle = await seedAssignments(usersByEmail, coursesByCode);
    const examsByKey = await seedExams(usersByEmail, coursesByCode);
    const gradesCount = await seedGrades(usersByEmail, examsByKey);
    const attendanceCount = await seedAttendance(usersByEmail, scheduleByBlueprintKey);

    const studentsCount = [...usersByEmail.values()].filter((user) => user.role === 'student').length;
    const teachersCount = [...usersByEmail.values()].filter((user) => user.role === 'teacher').length;

    console.log('CampusOS pilot seed completed successfully.');
    console.log('');
    console.log(`Students: ${studentsCount}`);
    console.log(`Teachers: ${teachersCount}`);
    console.log(`Courses: ${coursesByCode.size}`);
    console.log(`Assignments: ${assignmentsByTitle.size}`);
    console.log(`Exams: ${examsByKey.size}`);
    console.log(`Grades: ${gradesCount}`);
    console.log(`Attendance records: ${attendanceCount}`);
    console.log('');
    console.log('Seeded account summary:');
    console.log(`  Super Admin: ${process.env.SUPERADMIN_EMAIL || SUPERADMIN_EMAIL}`);
    console.log('  Admin, teacher, and student passwords are loaded from environment variables only.');
  } catch (error) {
    console.error('Error seeding demo data:', error);
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
