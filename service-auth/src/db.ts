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
  logger.info('Initializing auth schema');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(64) UNIQUE NOT NULL,
      password_hash VARCHAR(128) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  logger.info('Auth schema ready');
}
