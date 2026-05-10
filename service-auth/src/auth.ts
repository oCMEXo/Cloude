import { createHash } from 'crypto';
import jwt from 'jsonwebtoken';
import { logger } from './logger';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-secret-change-me';
const JWT_EXPIRES_IN = '1h';

export interface TokenPayload {
  username: string;
  iat?: number;
  exp?: number;
}

export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export function validateUsername(username: string): { ok: true } | { ok: false; reason: string } {
  if (!username) return { ok: false, reason: 'username is required' };
  if (username.length < 3) return { ok: false, reason: 'username must be at least 3 characters' };
  if (username.length > 32) return { ok: false, reason: 'username must be at most 32 characters' };
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { ok: false, reason: 'username may only contain letters, digits, and underscores' };
  }
  return { ok: true };
}

export function validatePassword(password: string): { ok: true } | { ok: false; reason: string } {
  if (!password) return { ok: false, reason: 'password is required' };
  if (password.length < 6) return { ok: false, reason: 'password must be at least 6 characters' };
  if (password.length > 128) return { ok: false, reason: 'password must be at most 128 characters' };
  return { ok: true };
}

export function issueToken(username: string): string {
  logger.debug('Issuing JWT', { username });
  return jwt.sign({ username }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    logger.debug('Token verified', { username: decoded.username });
    return decoded;
  } catch (err) {
    logger.warn('Token verification failed', { err: (err as Error).message });
    return null;
  }
}
