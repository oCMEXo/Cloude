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
  logger.info('Initializing orders schema');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(64) NOT NULL,
      total NUMERIC(12, 2) NOT NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'pending',
      items JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  logger.info('Orders schema ready');
}
