import express, { Request, Response, NextFunction } from 'express';
import { logger } from './logger';
import { calculateTotal, canTransition, validateItems, OrderStatus } from './orders';
import { insertOrder, getOrder, listByUser, setStatus } from './repository';

export function createApp(): express.Express {
  const app = express();
  app.use(express.json());

  app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.info('HTTP request', { method: req.method, path: req.path });
    next();
  });

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'service-orders' });
  });

  app.post('/orders', async (req: Request, res: Response) => {
    const { userId, items } = req.body || {};
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'userId is required' });
    }
    const validation = validateItems(items);
    if (!validation.ok) return res.status(400).json({ error: validation.reason });

    try {
      const totals = calculateTotal(validation.items);
      const order = await insertOrder(userId, validation.items, totals.total);
      return res.status(201).json({ ...order, breakdown: totals });
    } catch (err) {
      logger.error('Create order failed', { err: (err as Error).message });
      return res.status(500).json({ error: 'internal error' });
    }
  });

  app.get('/orders/:id', async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'invalid order id' });
    }
    try {
      const order = await getOrder(id);
      if (!order) return res.status(404).json({ error: 'order not found' });
      return res.json(order);
    } catch (err) {
      logger.error('Get order failed', { err: (err as Error).message });
      return res.status(500).json({ error: 'internal error' });
    }
  });

  app.get('/orders', async (req: Request, res: Response) => {
    const userId = req.query.userId as string;
    if (!userId) return res.status(400).json({ error: 'userId query parameter is required' });
    try {
      const orders = await listByUser(userId);
      return res.json(orders);
    } catch (err) {
      logger.error('List orders failed', { err: (err as Error).message });
      return res.status(500).json({ error: 'internal error' });
    }
  });

  app.patch('/orders/:id/status', async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const newStatus = req.body?.status as OrderStatus;
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'invalid order id' });
    }
    if (!newStatus) return res.status(400).json({ error: 'status is required' });

    try {
      const current = await getOrder(id);
      if (!current) return res.status(404).json({ error: 'order not found' });

      if (!canTransition(current.status, newStatus)) {
        logger.warn('Invalid status transition rejected', {
          orderId: id,
          from: current.status,
          to: newStatus
        });
        return res.status(409).json({
          error: `cannot transition from ${current.status} to ${newStatus}`
        });
      }

      const updated = await setStatus(id, newStatus);
      return res.json(updated);
    } catch (err) {
      logger.error('Update status failed', { err: (err as Error).message });
      return res.status(500).json({ error: 'internal error' });
    }
  });

  return app;
}
