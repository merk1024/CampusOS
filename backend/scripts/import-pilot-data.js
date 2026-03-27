const path = require('path');

const {
  INBOX_DIR,
  detectInboxFiles,
  runImportWorkflow
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
  const useInbox = hasFlag(args, '--from-inbox') || !args.some((arg) => arg.startsWith('--students') || arg.startsWith('--teachers') || arg.startsWith('--courses'));
  const inboxFiles = useInbox ? detectInboxFiles() : {};

  const studentsFile = getFlagValue(args, '--students') || inboxFiles.students?.path || null;
  const teachersFile = getFlagValue(args, '--teachers') || inboxFiles.teachers?.path || null;
  const coursesFile = getFlagValue(args, '--courses') || inboxFiles.courses?.path || null;

  if (!studentsFile && !teachersFile && !coursesFile) {
    throw new Error(
      `No import files were found. Pass --students/--teachers/--courses or place files into ${INBOX_DIR}.`
    );
  }

  const apply = hasFlag(args, '--apply');
  const reportStem = getFlagValue(args, '--report');
  const sourceLabel = getFlagValue(args, '--source-label') || (useInbox ? 'inbox-import' : 'manual-import');

  const { report, artifacts } = await runImportWorkflow({
    studentsFile,
    teachersFile,
    coursesFile,
    studentsSheet: getFlagValue(args, '--students-sheet'),
    teachersSheet: getFlagValue(args, '--teachers-sheet'),
    coursesSheet: getFlagValue(args, '--courses-sheet'),
    apply,
    sourceLabel,
    reportStem: reportStem ? path.resolve(reportStem) : null
  });

  console.log(`CampusOS ${apply ? 'import' : 'preview'} completed.`);
  console.log(`JSON report: ${artifacts.jsonPath}`);
  console.log(`Markdown report: ${artifacts.markdownPath}`);
  console.log('');
  Object.entries(report.summary).forEach(([entityKey, bucket]) => {
    if (!bucket.rows) {
      return;
    }

    console.log(
      `${entityKey}: rows=${bucket.rows}, valid=${bucket.valid}, create=${bucket.create}, update=${bucket.update}, skip=${bucket.skip}, warnings=${bucket.warnings}, errors=${bucket.errors}`
    );
  });
}

main().catch((error) => {
  console.error('Pilot import failed:', error.message);
  process.exit(1);
});
