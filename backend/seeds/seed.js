const bcrypt = require('bcryptjs');
const db = require('../config/database');

async function seed() {
  try {
    console.log('🌱 Starting database seeding...');

    // Hash passwords
    const salt = await bcrypt.genSalt(10);
    const studentPass = await bcrypt.hash('student', salt);
    const teacherPass = await bcrypt.hash('teacher', salt);
    const adminPass = await bcrypt.hash('admin', salt);

    // Insert users
    console.log('👥 Creating users...');
    await db.run(`
      INSERT INTO users (student_id, email, password, name, role, group_name, phone, avatar) VALUES
      ('240145121', 'student@alatoo.edu.kg', ?, 'Azamat Bekzhanov', 'student', 'COMSE-25', '+996555123456', 'AB'),
      (NULL, 'teacher@alatoo.edu.kg', ?, 'Azhar Kazakbaeva', 'teacher', NULL, '+996555123458', 'AK'),
      (NULL, 'admin@alatoo.edu.kg', ?, 'Admin User', 'admin', NULL, '+996555123459', 'AU')
    `, [studentPass, teacherPass, adminPass]);

    // Insert courses
    console.log('📚 Creating courses...');
    await db.run(`
      INSERT INTO courses (code, name, description, credits, semester, teacher_id) VALUES
      ('CS101', 'Programming Language 2', 'Advanced programming concepts', 3, 'Spring 2025-2026', 2),
      ('MATH201', 'Calculus 2', 'Integral calculus and series', 4, 'Spring 2025-2026', 2),
      ('WEB101', 'Web Development', 'Modern web technologies', 3, 'Spring 2025-2026', 2)
    `);

    // Insert exams
    console.log('📝 Creating exams...');
    await db.run(`
      INSERT INTO exams (course_id, group_name, subject, exam_date, exam_time, room, teacher_name, type, semester, created_by) VALUES
      (1, 'COMSE-25', 'Programming Language 2', '2026-02-20', '10:00', 'BIGLAB', 'Azhar Kazakbaeva', 'Экзамен', 'Spring 2025-2026', 2),
      (2, 'COMSE-25', 'Calculus 2', '2026-02-25', '14:00', 'B107', 'Hussien Chebsi', 'Экзамен', 'Spring 2025-2026', 2),
      (3, 'COMSE-25', 'Web Development', '2026-03-10', '11:00', 'B205', 'Azhar Kazakbaeva', 'Зачёт', 'Spring 2025-2026', 2)
    `);

    // Link students to exams
    console.log('🔗 Linking students to exams...');
    await db.run(`
      INSERT INTO exam_students (exam_id, student_id) VALUES
      (1, '240145121'),
      (2, '240145121'),
      (3, '240145121')
    `);

    // Insert grades
    console.log('📊 Creating grades...');
    await db.run(`
      INSERT INTO grades (exam_id, student_id, grade, graded_by) VALUES
      (1, '240145121', 85, 2),
      (2, '240145121', 78, 2),
      (3, '240145121', 92, 3)
    `);

    // Insert schedule
    console.log('📅 Creating schedule...');
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

    // Insert announcements
    console.log('📢 Creating announcements...');
    await db.run(`
      INSERT INTO announcements (title, content, type, is_pinned, created_by) VALUES
      ('Добро пожаловать!', 'Добро пожаловать в систему управления обучением Alatoo University. Здесь вы можете следить за своими оценками, расписанием и заданиями.', 'general', true, 3),
      ('Изменение расписания', 'Внимание! Занятие по Programming Language 2 в понедельник перенесено с 9:00 на 10:00.', 'important', false, 2),
      ('Экзаменационная сессия', 'Экзаменационная сессия начнется 20 февраля 2026. Не забудьте подготовиться!', 'exam', true, 2)
    `);

    // Insert assignments
    console.log('📝 Creating assignments...');
    await db.run(`
      INSERT INTO assignments (title, description, due_date, max_grade, created_by) VALUES
      ('Programming Language 2 - Lab 3', 'Complete the OOP exercises and submit your code. Include comments and documentation.', '2026-02-15', 100, 2),
      ('Calculus 2 - Problem Set 5', 'Solve integrals and differential equations from chapters 7-8.', '2026-02-18', 50, 2),
      ('Web Development - Portfolio Project', 'Create a responsive portfolio website using HTML, CSS, and JavaScript.', '2026-02-25', 200, 2)
    `);

    console.log('✅ Database seeding completed successfully!');
    console.log('');
    console.log('📝 Test accounts:');
    console.log('   Student: student@alatoo.edu.kg / student');
    console.log('   Teacher: teacher@alatoo.edu.kg / teacher');
    console.log('   Admin:   admin@alatoo.edu.kg / admin');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

// Run seeding if called directly
if (require.main === module) {
  seed().then(() => {
    console.log('🎉 Seeding complete!');
    process.exit(0);
  }).catch((err) => {
    console.error('💥 Seeding failed:', err);
    process.exit(1);
  });
}

module.exports = seed;
