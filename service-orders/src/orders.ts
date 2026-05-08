import { logger } from './logger';

export interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

export const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: []
};

export function calculateSubtotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
}

export function calculateDiscount(subtotal: number): number {
  // tiered discount: 5% over $100, 10% over $500
  if (subtotal >= 500) return subtotal * 0.10;
  if (subtotal >= 100) return subtotal * 0.05;
  return 0;
}

export function calculateTax(subtotal: number, discount: number, taxRate = 0.21): number {
  // VAT applies to the discounted amount
  return (subtotal - discount) * taxRate;
}

export function calculateTotal(items: OrderItem[]): {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
} {
  if (items.length === 0) {
    logger.warn('calculateTotal called with empty items');
    return { subtotal: 0, discount: 0, tax: 0, total: 0 };
  }
  const subtotal = round(calculateSubtotal(items));
  const discount = round(calculateDiscount(subtotal));
  const tax = round(calculateTax(subtotal, discount));
  const total = round(subtotal - discount + tax);
  logger.debug('Order totals computed', { subtotal, discount, tax, total });
  return { subtotal, discount, tax, total };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export function validateItems(items: unknown): { ok: true; items: OrderItem[] } | { ok: false; reason: string } {
  if (!Array.isArray(items)) return { ok: false, reason: 'items must be an array' };
  if (items.length === 0) return { ok: false, reason: 'order must contain at least one item' };
  if (items.length > 100) return { ok: false, reason: 'order may not contain more than 100 items' };

  for (let i = 0; i < items.length; i++) {
    const item = items[i] as Partial<OrderItem>;
    if (!item || typeof item !== 'object') {
      return { ok: false, reason: `item ${i} is not an object` };
    }
    if (typeof item.productId !== 'string' || !item.productId) {
      return { ok: false, reason: `item ${i}: productId is required` };
    }
    if (typeof item.quantity !== 'number' || !Number.isInteger(item.quantity) || item.quantity <= 0) {
      return { ok: false, reason: `item ${i}: quantity must be a positive integer` };
    }
    if (typeof item.unitPrice !== 'number' || item.unitPrice < 0) {
      return { ok: false, reason: `item ${i}: unitPrice must be a non-negative number` };
    }
  }
  return { ok: true, items: items as OrderItem[] };
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
