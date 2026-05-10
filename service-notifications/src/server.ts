import { createApp } from './app';
import { initSchema, pool } from './db';
import { logger } from './logger';

const PORT = Number(process.env.PORT) || 3003;

async function main() {
  let attempts = 0;
  while (attempts < 10) {
    try {
      await initSchema();
      break;
    } catch (err) {
      attempts++;
      logger.warn('DB not ready, retrying', { attempt: attempts, err: (err as Error).message });
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  if (attempts === 10) {
    logger.error('DB never became ready, exiting');
    process.exit(1);
  }

  const app = createApp();
  app.listen(PORT, () => {
    logger.info('service-notifications listening', { port: PORT });
  });
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down');
  await pool.end();
  process.exit(0);
});

main().catch((err) => {
  logger.error('Fatal startup error', { err: err.message });
  process.exit(1);
});
