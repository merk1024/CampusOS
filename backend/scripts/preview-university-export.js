const path = require('path');

const {
  INBOX_DIR,
  detectInboxFiles,
  REPORTS_DIR,
  runImportWorkflow
} = require('./lib/pilot-import');

async function main() {
  const inboxFiles = detectInboxFiles(INBOX_DIR);

  if (!Object.keys(inboxFiles).length) {
    throw new Error(
      `No test export files were found in ${INBOX_DIR}. Add students/teachers/courses/enrollments/schedule files and try again.`
    );
  }

  const { report, artifacts } = await runImportWorkflow({
    studentsFile: inboxFiles.students?.path || null,
    teachersFile: inboxFiles.teachers?.path || null,
    coursesFile: inboxFiles.courses?.path || null,
    enrollmentsFile: inboxFiles.enrollments?.path || null,
    scheduleFile: inboxFiles.schedule?.path || null,
    apply: false,
    sourceLabel: 'university-export-read-only-preview',
    reportStem: path.join(REPORTS_DIR, 'university-export-preview')
  });

  console.log('CampusOS read-only university export preview completed.');
  console.log(`JSON report: ${artifacts.jsonPath}`);
  console.log(`Markdown report: ${artifacts.markdownPath}`);
  console.log(`Issues found: ${report.issues.length}`);
}

main().catch((error) => {
  console.error('Read-only preview failed:', error.message);
  process.exit(1);
});
