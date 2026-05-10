import request from 'supertest';
import { OrderItem } from './orders';

jest.mock('./repository', () => {
  let nextId = 1;
  const orders = new Map<number, ReturnType<typeof makeOrder>>();

  function makeOrder(id: number, userId: string, items: OrderItem[], total: number) {
    return { id, userId, total, status: 'pending' as const, items, createdAt: new Date() };
  }

  return {
    insertOrder: jest.fn(async (userId: string, items: OrderItem[], total: number) => {
      const order = makeOrder(nextId++, userId, items, total);
      orders.set(order.id, order);
      return order;
    }),
    getOrder: jest.fn(async (id: number) => orders.get(id) || null),
    listByUser: jest.fn(async (userId: string) =>
      Array.from(orders.values()).filter((o) => o.userId === userId)
    ),
    setStatus: jest.fn(async (id: number, status: string) => {
      const o = orders.get(id);
      if (!o) return null;
      o.status = status;
      return o;
    }),
    __reset: () => {
      orders.clear();
      nextId = 1;
    }
  };
});

import { createApp } from './app';
const repoMock = jest.requireMock('./repository');

const app = createApp();

beforeEach(() => {
  repoMock.__reset();
});

const validItems: OrderItem[] = [
  { productId: 'p1', quantity: 2, unitPrice: 10 },
  { productId: 'p2', quantity: 1, unitPrice: 5 }
];

describe('GET /health', () => {
  it('returns ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
  });
});

describe('POST /orders', () => {
  it('creates an order with totals breakdown', async () => {
    const res = await request(app)
      .post('/orders')
      .send({ userId: 'user-1', items: validItems });
    expect(res.status).toBe(201);
    expect(res.body.userId).toBe('user-1');
    expect(res.body.status).toBe('pending');
    expect(res.body.breakdown).toBeDefined();
    expect(res.body.breakdown.subtotal).toBe(25);
  });

  it('rejects missing userId', async () => {
    const res = await request(app).post('/orders').send({ items: validItems });
    expect(res.status).toBe(400);
  });

  it('rejects empty items', async () => {
    const res = await request(app).post('/orders').send({ userId: 'u1', items: [] });
    expect(res.status).toBe(400);
  });

  it('rejects invalid item shape', async () => {
    const res = await request(app)
      .post('/orders')
      .send({ userId: 'u1', items: [{ productId: 'p', quantity: 0, unitPrice: 5 }] });
    expect(res.status).toBe(400);
  });
});

describe('GET /orders/:id', () => {
  it('retrieves a created order', async () => {
    const created = await request(app)
      .post('/orders')
      .send({ userId: 'u1', items: validItems });
    const res = await request(app).get(`/orders/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.body.id);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/orders/99999');
    expect(res.status).toBe(404);
  });

  it('returns 400 for invalid id', async () => {
    const res = await request(app).get('/orders/abc');
    expect(res.status).toBe(400);
  });
});

describe('GET /orders?userId=...', () => {
  it('lists orders for a user', async () => {
    await request(app).post('/orders').send({ userId: 'alice', items: validItems });
    await request(app).post('/orders').send({ userId: 'alice', items: validItems });
    await request(app).post('/orders').send({ userId: 'bob', items: validItems });
    const res = await request(app).get('/orders?userId=alice');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it('rejects missing userId query', async () => {
    const res = await request(app).get('/orders');
    expect(res.status).toBe(400);
  });
});

describe('PATCH /orders/:id/status', () => {
  it('transitions pending → paid', async () => {
    const created = await request(app)
      .post('/orders')
      .send({ userId: 'u1', items: validItems });
    const res = await request(app)
      .patch(`/orders/${created.body.id}/status`)
      .send({ status: 'paid' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('paid');
  });

  it('rejects invalid transition (pending → shipped)', async () => {
    const created = await request(app)
      .post('/orders')
      .send({ userId: 'u1', items: validItems });
    const res = await request(app)
      .patch(`/orders/${created.body.id}/status`)
      .send({ status: 'shipped' });
    expect(res.status).toBe(409);
  });

  it('returns 404 for unknown order', async () => {
    const res = await request(app).patch('/orders/99999/status').send({ status: 'paid' });
    expect(res.status).toBe(404);
  });
});
