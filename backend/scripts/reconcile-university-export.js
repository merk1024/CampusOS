const path = require('path');

const {
  INBOX_DIR,
  REPORTS_DIR,
  detectInboxFiles,
  runReconciliationWorkflow
} = require('./lib/pilot-import');

const getFlagValue = (args, flagName) => {
  const index = args.indexOf(flagName);
  if (index === -1) {
    return null;
  }

  return args[index + 1] || null;
};

const hasFlag = (args, flagName) => args.includes(flagName);

async function main() {
  const args = process.argv.slice(2);
  const useInbox = hasFlag(args, '--from-inbox') || !args.some(
    (arg) => arg.startsWith('--students')
      || arg.startsWith('--teachers')
      || arg.startsWith('--courses')
      || arg.startsWith('--enrollments')
      || arg.startsWith('--schedule')
  );
  const inboxFiles = useInbox ? detectInboxFiles() : {};

  const studentsFile = getFlagValue(args, '--students') || inboxFiles.students?.path || null;
  const teachersFile = getFlagValue(args, '--teachers') || inboxFiles.teachers?.path || null;
  const coursesFile = getFlagValue(args, '--courses') || inboxFiles.courses?.path || null;
  const enrollmentsFile = getFlagValue(args, '--enrollments') || inboxFiles.enrollments?.path || null;
  const scheduleFile = getFlagValue(args, '--schedule') || inboxFiles.schedule?.path || null;

  if (!studentsFile && !teachersFile && !coursesFile && !enrollmentsFile && !scheduleFile) {
    throw new Error(
      `No reconciliation files were found. Pass --students/--teachers/--courses/--enrollments/--schedule or place files into ${INBOX_DIR}.`
    );
  }

  const reportStem = getFlagValue(args, '--report');
  const sourceLabel = getFlagValue(args, '--source-label') || (useInbox ? 'inbox-reconciliation' : 'manual-reconciliation');

  const { report, artifacts } = await runReconciliationWorkflow({
    studentsFile,
    teachersFile,
    coursesFile,
    enrollmentsFile,
    scheduleFile,
    studentsSheet: getFlagValue(args, '--students-sheet'),
    teachersSheet: getFlagValue(args, '--teachers-sheet'),
    coursesSheet: getFlagValue(args, '--courses-sheet'),
    enrollmentsSheet: getFlagValue(args, '--enrollments-sheet'),
    scheduleSheet: getFlagValue(args, '--schedule-sheet'),
    sourceLabel,
    reportStem: reportStem ? path.resolve(reportStem) : path.join(REPORTS_DIR, 'university-export-reconciliation')
  });

  console.log('CampusOS reconciliation completed.');
  console.log(`JSON report: ${artifacts.jsonPath}`);
  console.log(`Markdown report: ${artifacts.markdownPath}`);
  console.log('');

  Object.entries(report.summary).forEach(([entityKey, bucket]) => {
    console.log(
      `${entityKey}: export=${bucket.rowsInExport}, campus=${bucket.rowsInCampusOS}, matched=${bucket.matched}, mismatched=${bucket.mismatched}, onlyInExport=${bucket.onlyInExport}, onlyInCampusOS=${bucket.onlyInCampusOS}, invalid=${bucket.invalid}`
    );
  });
}

main().catch((error) => {
  console.error('Reconciliation failed:', error.message);
  process.exit(1);
});
