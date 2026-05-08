import express, { Request, Response, NextFunction } from 'express';
import { logger } from './logger';
import {
  Channel,
  validateRecipient,
  validateBody,
  validateSubject,
  templateBody
} from './notifications';
import { enqueue, get, markSent } from './repository';

export function createApp(): express.Express {
  const app = express();
  app.use(express.json());

  app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.info('HTTP request', { method: req.method, path: req.path });
    next();
  });

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'service-notifications' });
  });

  app.post('/notifications', async (req: Request, res: Response) => {
    const { recipient, channel, subject, body, template, vars } = req.body || {};

    if (!channel) return res.status(400).json({ error: 'channel is required' });
    const recipientCheck = validateRecipient(channel as Channel, recipient);
    if (!recipientCheck.ok) return res.status(400).json({ error: recipientCheck.reason });

    let finalBody = body;
    if (template) {
      finalBody = templateBody(template, vars || {});
    }

    const bodyCheck = validateBody(finalBody);
    if (!bodyCheck.ok) return res.status(400).json({ error: bodyCheck.reason });

    const subjectCheck = validateSubject(subject);
    if (!subjectCheck.ok) return res.status(400).json({ error: subjectCheck.reason });

    try {
      const notification = await enqueue(recipient, channel as Channel, finalBody, subject);
      // simulate sending — in production this would call SMTP/Twilio/FCM
      await markSent(notification.id);
      const updated = await get(notification.id);
      return res.status(201).json(updated);
    } catch (err) {
      logger.error('Enqueue failed', { err: (err as Error).message });
      return res.status(500).json({ error: 'internal error' });
    }
  });

  app.get('/notifications/:id', async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'invalid id' });
    }
    try {
      const n = await get(id);
      if (!n) return res.status(404).json({ error: 'notification not found' });
      return res.json(n);
    } catch (err) {
      logger.error('Get notification failed', { err: (err as Error).message });
      return res.status(500).json({ error: 'internal error' });
    }
  });

  return app;
}
