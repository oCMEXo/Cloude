import { logger } from './logger';
import { randomUUID } from 'crypto';

export interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'paid' | 'shipped' | 'cancelled';
  createdAt: string;
}

const orders = new Map<string, Order>();

export function calculateTotal(items: OrderItem[]): number {
  if (items.length === 0) {
    logger.warn('calculateTotal called with empty items array');
    return 0;
  }
  const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  logger.debug('Total calculated', { itemCount: items.length, total });
  return Number(total.toFixed(2));
}

export function createOrder(userId: string, items: OrderItem[]): Order {
  logger.info('Creating order', { userId, itemCount: items.length });

  if (!userId) {
    logger.error('createOrder failed: missing userId');
    throw new Error('userId is required');
  }
  if (items.length === 0) {
    logger.error('createOrder failed: empty items', { userId });
    throw new Error('order must contain at least one item');
  }
  for (const item of items) {
    if (item.quantity <= 0 || item.unitPrice < 0) {
      logger.error('createOrder failed: invalid item', { userId, item });
      throw new Error('invalid item: quantity must be > 0, unitPrice >= 0');
    }
  }

  const order: Order = {
    id: randomUUID(),
    userId,
    items,
    total: calculateTotal(items),
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  orders.set(order.id, order);
  logger.info('Order created', { orderId: order.id, userId, total: order.total });
  return order;
}

export function getOrder(orderId: string): Order | undefined {
  logger.debug('Fetching order', { orderId });
  const order = orders.get(orderId);
  if (!order) {
    logger.warn('Order not found', { orderId });
  }
  return order;
}

export function updateStatus(orderId: string, status: Order['status']): Order {
  logger.info('Updating order status', { orderId, status });
  const order = orders.get(orderId);
  if (!order) {
    logger.error('updateStatus failed: order not found', { orderId });
    throw new Error(`order ${orderId} not found`);
  }
  order.status = status;
  logger.info('Order status updated', { orderId, status });
  return order;
}

if (require.main === module) {
  logger.info('service-orders starting up', { pid: process.pid });
}
