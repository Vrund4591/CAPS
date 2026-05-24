const { spawn, spawnSync } = require('child_process');

const MAX_ATTEMPTS = Number.parseInt(process.env.MIGRATE_RETRY_ATTEMPTS || '5', 10);
const RETRY_DELAY_MS = Number.parseInt(process.env.MIGRATE_RETRY_DELAY_MS || '5000', 10);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableMigrateError = (output) => {
  return output.includes('P1002') || output.includes('pg_advisory_lock');
};

const runMigrateDeploy = (attempt) => {
  console.log(`Running prisma migrate deploy (attempt ${attempt}/${MAX_ATTEMPTS})...`);

  const result = spawnSync('prisma', ['migrate', 'deploy'], {
    encoding: 'utf8',
    env: process.env,
  });

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  return result;
};

const startServer = () => {
  const server = spawn('node', ['server.js'], {
    stdio: 'inherit',
    env: process.env,
  });

  server.on('exit', (code) => {
    process.exit(code || 0);
  });
};

const main = async () => {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const result = runMigrateDeploy(attempt);

    if (result.status === 0) {
      startServer();
      return;
    }

    const combinedOutput = `${result.stdout || ''}\n${result.stderr || ''}`;
    const retryable = isRetryableMigrateError(combinedOutput);

    if (!retryable || attempt === MAX_ATTEMPTS) {
      console.error('Migration failed and cannot be retried. Exiting.');
      process.exit(result.status || 1);
    }

    console.warn(`Migration hit a transient lock timeout. Retrying in ${RETRY_DELAY_MS}ms...`);
    await wait(RETRY_DELAY_MS);
  }
};

main().catch((error) => {
  console.error('Startup script failed:', error);
  process.exit(1);
});