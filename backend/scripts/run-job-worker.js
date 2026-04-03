const { runQueuedJobs } = require('../utils/platformOps');

async function main() {
  const result = await runQueuedJobs({
    workerName: process.env.JOB_WORKER_NAME || 'campusos-cli-worker',
    limit: Math.min(Math.max(Number(process.env.JOB_WORKER_BATCH_SIZE || 25), 1), 100)
  });

  console.log(`CampusOS job worker processed ${result.processedCount} job(s).`);
  if (result.jobs.length > 0) {
    console.log(JSON.stringify(result.jobs, null, 2));
  }
}

main().catch((error) => {
  console.error('CampusOS job worker failed:', error);
  process.exit(1);
});
