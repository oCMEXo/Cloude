import { logger } from './logger';
import { createHash } from 'crypto';

interface User {
  username: string;
  passwordHash: string;
}

// In-memory user store for demo purposes
const users: User[] = [
  { username: 'alice', passwordHash: hashPassword('secret') },
  { username: 'bob', passwordHash: hashPassword('hunter2') }
];

export function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

export function authenticate(username: string, password: string): boolean {
  logger.info('Authentication attempt', { username });

  if (!username || !password) {
    logger.warn('Missing credentials', { username });
    return false;
  }

  const user = users.find((u) => u.username === username);
  if (!user) {
    logger.warn('User not found', { username });
    return false;
  }

  const success = user.passwordHash === hashPassword(password);

  if (success) {
    logger.info('Authentication succeeded', { username });
  } else {
    logger.error('Authentication failed: wrong password', { username });
  }

  return success;
}

export function generateToken(username: string): string {
  logger.debug('Generating token', { username });
  const token = createHash('sha256')
    .update(`${username}-${Date.now()}`)
    .digest('hex');
  logger.info('Token issued', { username, tokenPrefix: token.slice(0, 8) });
  return token;
}

if (require.main === module) {
  logger.info('service-auth starting up', { pid: process.pid });
}
