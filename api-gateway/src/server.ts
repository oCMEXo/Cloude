import { createApp } from './app';
import { logger } from './logger';

const PORT = Number(process.env.PORT) || 8080;

const app = createApp();
app.listen(PORT, () => {
  logger.info('api-gateway listening', { port: PORT });
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down');
  process.exit(0);
});
