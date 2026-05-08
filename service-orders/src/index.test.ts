import { calculateTotal, createOrder, getOrder, updateStatus, OrderItem } from './index';

const sampleItems: OrderItem[] = [
  { productId: 'p1', quantity: 2, unitPrice: 10.5 },
  { productId: 'p2', quantity: 1, unitPrice: 5 }
];

describe('calculateTotal', () => {
  it('returns 0 for empty items', () => {
    expect(calculateTotal([])).toBe(0);
  });

  it('sums quantity * unitPrice across items', () => {
    expect(calculateTotal(sampleItems)).toBe(26);
  });

  it('rounds to 2 decimal places', () => {
    expect(calculateTotal([{ productId: 'x', quantity: 3, unitPrice: 0.1 }])).toBe(0.3);
  });
});

describe('createOrder', () => {
  it('creates an order with correct fields', () => {
    const order = createOrder('user-1', sampleItems);
    expect(order.userId).toBe('user-1');
    expect(order.items).toEqual(sampleItems);
    expect(order.total).toBe(26);
    expect(order.status).toBe('pending');
    expect(order.id).toBeTruthy();
    expect(order.createdAt).toBeTruthy();
  });

  it('throws when userId is missing', () => {
    expect(() => createOrder('', sampleItems)).toThrow('userId is required');
  });

  it('throws when items is empty', () => {
    expect(() => createOrder('user-1', [])).toThrow('at least one item');
  });

  it('throws on invalid quantity', () => {
    expect(() =>
      createOrder('user-1', [{ productId: 'p', quantity: 0, unitPrice: 5 }])
    ).toThrow('invalid item');
  });

  it('throws on negative price', () => {
    expect(() =>
      createOrder('user-1', [{ productId: 'p', quantity: 1, unitPrice: -1 }])
    ).toThrow('invalid item');
  });
});

describe('getOrder / updateStatus', () => {
  it('retrieves a previously created order', () => {
    const created = createOrder('user-2', sampleItems);
    const fetched = getOrder(created.id);
    expect(fetched).toEqual(created);
  });

  it('returns undefined for unknown orderId', () => {
    expect(getOrder('does-not-exist')).toBeUndefined();
  });

  it('updates the status of an existing order', () => {
    const order = createOrder('user-3', sampleItems);
    const updated = updateStatus(order.id, 'paid');
    expect(updated.status).toBe('paid');
  });

  it('throws when updating an unknown order', () => {
    expect(() => updateStatus('nope', 'paid')).toThrow('not found');
  });
});
