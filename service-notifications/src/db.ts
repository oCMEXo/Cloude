import { Pool } from 'pg';
import { logger } from './logger';

export const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: Number(process.env.POSTGRES_PORT) || 5432,
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'app',
  max: 10
});

pool.on('error', (err) => {
  logger.error('Unexpected pg pool error', { err: err.message });
});

export async function initSchema(): Promise<void> {
  logger.info('Initializing notifications schema');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      recipient VARCHAR(255) NOT NULL,
      channel VARCHAR(16) NOT NULL,
      subject VARCHAR(255),
      body TEXT NOT NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'queued',
      attempts INT NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      sent_at TIMESTAMP
    )
  `);
  logger.info('Notifications schema ready');
}
