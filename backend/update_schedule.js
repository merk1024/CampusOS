const db = require('./config/database');

async function updateSchedule() {
  try {
    // Clear existing data that references schedule
    await db.run('DELETE FROM attendance');
    await db.run('DELETE FROM schedule');

    // Insert new comprehensive schedule
    await db.run(`
      INSERT INTO schedule (day, time_slot, group_name, subject, teacher, room) VALUES
      ('Понедельник', '09:00', 'COMSE-25', 'Programming Language 2', 'Azhar Kazakbaeva', 'BIGLAB'),
      ('Понедельник', '10:30', 'COMSE-25', 'Calculus 2', 'Hussien Chebsi', 'B107'),
      ('Понедельник', '12:00', 'COMSE-25', 'English for Engineers', 'Aizada Asanbekova', 'A201'),
      ('Понедельник', '13:30', 'COMSE-25', 'Data Structures', 'Azhar Kazakbaeva', 'BIGLAB'),
      ('Понедельник', '15:00', 'COMSE-25', 'Web Development', 'Maria Johnson', 'B205'),
      ('Вторник', '09:00', 'COMSE-25', 'Algorithms', 'John Smith', 'A105'),
      ('Вторник', '10:30', 'COMSE-25', 'Database Systems', 'Sarah Wilson', 'B301'),
      ('Вторник', '12:00', 'COMSE-25', 'Computer Networks', 'David Brown', 'C102'),
      ('Вторник', '13:30', 'COMSE-25', 'Software Engineering', 'Lisa Davis', 'A203'),
      ('Вторник', '15:00', 'COMSE-25', 'Mobile Development', 'Mike Johnson', 'BIGLAB'),
      ('Среда', '09:00', 'COMSE-25', 'Programming Language 2 Lab', 'Azhar Kazakbaeva', 'BIGLAB'),
      ('Среда', '10:30', 'COMSE-25', 'Calculus 2', 'Hussien Chebsi', 'B107'),
      ('Среда', '12:00', 'COMSE-25', 'Data Structures Lab', 'Azhar Kazakbaeva', 'BIGLAB'),
      ('Среда', '13:30', 'COMSE-25', 'Web Development Lab', 'Maria Johnson', 'B205'),
      ('Четверг', '09:00', 'COMSE-25', 'Algorithms', 'John Smith', 'A105'),
      ('Четверг', '10:30', 'COMSE-25', 'Database Systems', 'Sarah Wilson', 'B301'),
      ('Четверг', '12:00', 'COMSE-25', 'Computer Networks Lab', 'David Brown', 'C102'),
      ('Четверг', '13:30', 'COMSE-25', 'Software Engineering', 'Lisa Davis', 'A203'),
      ('Пятница', '09:00', 'COMSE-25', 'Mobile Development Lab', 'Mike Johnson', 'BIGLAB'),
      ('Пятница', '10:30', 'COMSE-25', 'English for Engineers', 'Aizada Asanbekova', 'A201'),
      ('Пятница', '12:00', 'COMSE-25', 'Project Work', 'Various', 'BIGLAB')
    `);

    console.log('Schedule updated successfully with comprehensive timetable');
  } catch (error) {
    console.error('Error updating schedule:', error);
  }
}

updateSchedule();