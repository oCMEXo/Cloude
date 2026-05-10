import { pool } from './db';
import { logger } from './logger';
import { OrderItem, OrderStatus } from './orders';

export interface Order {
  id: number;
  userId: string;
  total: number;
  status: OrderStatus;
  items: OrderItem[];
  createdAt: Date;
}

function rowToOrder(row: Record<string, unknown>): Order {
  return {
    id: row.id as number,
    userId: row.user_id as string,
    total: Number(row.total),
    status: row.status as OrderStatus,
    items: row.items as OrderItem[],
    createdAt: row.created_at as Date
  };
}

export async function insertOrder(
  userId: string,
  items: OrderItem[],
  total: number
): Promise<Order> {
  logger.info('Inserting order', { userId, itemCount: items.length, total });
  const result = await pool.query(
    `INSERT INTO orders (user_id, total, items) VALUES ($1, $2, $3::jsonb)
     RETURNING id, user_id, total, status, items, created_at`,
    [userId, total, JSON.stringify(items)]
  );
  const order = rowToOrder(result.rows[0]);
  logger.info('Order inserted', { orderId: order.id, userId });
  return order;
}

export async function getOrder(id: number): Promise<Order | null> {
  const result = await pool.query(
    'SELECT id, user_id, total, status, items, created_at FROM orders WHERE id = $1',
    [id]
  );
  if (result.rows.length === 0) {
    logger.warn('Order not found', { orderId: id });
    return null;
  }
  return rowToOrder(result.rows[0]);
}

export async function listByUser(userId: string): Promise<Order[]> {
  const result = await pool.query(
    'SELECT id, user_id, total, status, items, created_at FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  );
  logger.debug('Listed orders for user', { userId, count: result.rows.length });
  return result.rows.map(rowToOrder);
}

export async function setStatus(id: number, status: OrderStatus): Promise<Order | null> {
  const result = await pool.query(
    `UPDATE orders SET status = $1 WHERE id = $2
     RETURNING id, user_id, total, status, items, created_at`,
    [status, id]
  );
  if (result.rows.length === 0) {
    logger.warn('setStatus: order not found', { orderId: id });
    return null;
  }
  logger.info('Order status updated', { orderId: id, status });
  return rowToOrder(result.rows[0]);
}
