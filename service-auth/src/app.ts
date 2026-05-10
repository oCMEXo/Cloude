import express, { Request, Response, NextFunction } from 'express';
import { logger } from './logger';
import { issueToken, verifyToken, validateUsername, validatePassword } from './auth';
import { createUser, findByUsername, verifyCredentials } from './users';

export function createApp(): express.Express {
  const app = express();
  app.use(express.json());

  app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.info('HTTP request', { method: req.method, path: req.path });
    next();
  });

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'service-auth' });
  });

  app.post('/register', async (req: Request, res: Response) => {
    const { username, password } = req.body || {};

    const u = validateUsername(username);
    if (!u.ok) return res.status(400).json({ error: u.reason });
    const p = validatePassword(password);
    if (!p.ok) return res.status(400).json({ error: p.reason });

    try {
      const existing = await findByUsername(username);
      if (existing) {
        logger.warn('Register conflict', { username });
        return res.status(409).json({ error: 'username already taken' });
      }
      const user = await createUser(username, password);
      const token = issueToken(user.username);
      return res.status(201).json({ id: user.id, username: user.username, token });
    } catch (err) {
      logger.error('Register failed', { err: (err as Error).message });
      return res.status(500).json({ error: 'internal error' });
    }
  });

  app.post('/login', async (req: Request, res: Response) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }
    try {
      const user = await verifyCredentials(username, password);
      if (!user) return res.status(401).json({ error: 'invalid credentials' });
      const token = issueToken(user.username);
      return res.json({ username: user.username, token });
    } catch (err) {
      logger.error('Login failed', { err: (err as Error).message });
      return res.status(500).json({ error: 'internal error' });
    }
  });

  app.post('/verify', (req: Request, res: Response) => {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ error: 'token is required' });
    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'invalid or expired token' });
    return res.json({ valid: true, username: payload.username });
  });

  return app;
}
