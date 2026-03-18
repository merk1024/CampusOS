const db = require('./config/database');

async function addAssignments() {
  try {
    await db.run(`
      INSERT INTO assignments (title, description, due_date, max_grade, created_by) VALUES
      ('Programming Language 2 - Lab 3', 'Complete the OOP exercises and submit your code. Include comments and documentation.', '2026-02-15', 100, 2),
      ('Calculus 2 - Problem Set 5', 'Solve integrals and differential equations from chapters 7-8.', '2026-02-18', 50, 2),
      ('Web Development - Portfolio Project', 'Create a responsive portfolio website using HTML, CSS, and JavaScript.', '2026-02-25', 200, 2)
    `);
    console.log('Assignments added successfully');
  } catch (error) {
    console.error('Error:', error);
  }
}

addAssignments();