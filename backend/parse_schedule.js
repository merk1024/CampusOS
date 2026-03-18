const fs = require('fs');
const path = require('path');

// Read the HTML file
const htmlContent = fs.readFileSync(path.join(__dirname, 'MONDAY Spring25.html'), 'utf8');

console.log('HTML file loaded, length:', htmlContent.length);

// Simple HTML parsing to extract schedule data
// This is a basic parser - you might need to adjust based on actual HTML structure

const extractScheduleData = (html) => {
  const schedule = [];
  const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];

  rows.forEach((row, index) => {
    if (index === 0) return; // Skip header

    const cells = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [];
    if (cells.length >= 4) {
      const time = cells[0].replace(/<[^>]+>/g, '').trim();
      const subject = cells[1].replace(/<[^>]+>/g, '').trim();
      const teacher = cells[2].replace(/<[^>]+>/g, '').trim();
      const room = cells[3].replace(/<[^>]+>/g, '').trim();

      if (time && subject) {
        schedule.push({
          day: 'Понедельник',
          time_slot: time,
          subject,
          teacher,
          room
        });
      }
    }
  });

  return schedule;
};

const scheduleData = extractScheduleData(htmlContent);
console.log('Extracted schedule entries:', scheduleData.length);
console.log('Sample entries:', scheduleData.slice(0, 3));

// Generate SQL insert statements
const sqlStatements = scheduleData.map(entry =>
  `INSERT INTO schedule (day, time_slot, group_name, subject, teacher, room) VALUES ('${entry.day}', '${entry.time_slot}', 'COMSE-25', '${entry.subject.replace(/'/g, "''")}', '${entry.teacher.replace(/'/g, "''")}', '${entry.room}');`
).join('\n');

console.log('\nSQL INSERT statements:');
console.log(sqlStatements);

// Save to file
fs.writeFileSync(path.join(__dirname, 'schedule_import.sql'), sqlStatements);
console.log('\nSQL saved to schedule_import.sql');