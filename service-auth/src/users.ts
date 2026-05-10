import { pool } from './db';
import { hashPassword } from './auth';
import { logger } from './logger';

export interface User {
  id: number;
  username: string;
  passwordHash: string;
  createdAt: Date;
}

export async function findByUsername(username: string): Promise<User | null> {
  const result = await pool.query(
    'SELECT id, username, password_hash, created_at FROM users WHERE username = $1',
    [username]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    createdAt: row.created_at
  };
}

export async function createUser(username: string, password: string): Promise<User> {
  logger.info('Creating user', { username });
  const passwordHash = hashPassword(password);
  const result = await pool.query(
    `INSERT INTO users (username, password_hash) VALUES ($1, $2)
     RETURNING id, username, password_hash, created_at`,
    [username, passwordHash]
  );
  const row = result.rows[0];
  logger.info('User created', { username, userId: row.id });
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    createdAt: row.created_at
  };
}

export async function verifyCredentials(
  username: string,
  password: string
): Promise<User | null> {
  const user = await findByUsername(username);
  if (!user) {
    logger.warn('Login attempted for nonexistent user', { username });
    return null;
  }
  const ok = user.passwordHash === hashPassword(password);
  if (!ok) {
    logger.warn('Login failed: wrong password', { username });
    return null;
  }
  logger.info('Login succeeded', { username });
  return user;
}
