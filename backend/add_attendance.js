const db = require('./config/database');

async function addAttendance() {
  try {
    // Add some attendance records for student 240145121
    await db.run(`
      INSERT INTO attendance (schedule_id, student_id, date, status, marked_by) VALUES
      (1, '240145121', '2026-03-17', 'present', 2),
      (2, '240145121', '2026-03-17', 'late', 2),
      (3, '240145121', '2026-03-18', 'present', 2),
      (4, '240145121', '2026-03-19', 'absent', 2),
      (5, '240145121', '2026-03-20', 'present', 2)
    `);
    console.log('Attendance records added successfully');
  } catch (error) {
    console.error('Error:', error);
  }
}

addAttendance();