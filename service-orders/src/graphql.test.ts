import request from 'supertest';
import { OrderItem } from './orders';

jest.mock('./repository', () => {
  let nextId = 1;
  const orders = new Map<number, ReturnType<typeof makeOrder>>();

  function makeOrder(id: number, userId: string, items: OrderItem[], total: number) {
    return {
      id,
      userId,
      total,
      status: 'pending' as const,
      items,
      createdAt: new Date('2025-01-01T00:00:00Z')
    };
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
    setStatus: jest.fn(async () => null),
    __reset: () => {
      orders.clear();
      nextId = 1;
    },
    __seed: (userId: string, items: OrderItem[], total: number) => {
      const order = makeOrder(nextId++, userId, items, total);
      orders.set(order.id, order);
      return order;
    }
  };
});

import { createAppWithGraphQL } from './app';
const repoMock = jest.requireMock('./repository');

const validItems: OrderItem[] = [
  { productId: 'p1', quantity: 2, unitPrice: 10 },
  { productId: 'p2', quantity: 1, unitPrice: 5 }
];

let app: Awaited<ReturnType<typeof createAppWithGraphQL>>;

beforeAll(async () => {
  app = await createAppWithGraphQL();
});

beforeEach(() => {
  repoMock.__reset();
});

async function gql(query: string, variables?: Record<string, unknown>) {
  return request(app)
    .post('/graphql')
    .set('Content-Type', 'application/json')
    .set('Apollo-Require-Preflight', 'true') // Apollo CSRF protection
    .send({ query, variables });
}

describe('GraphQL: query order(id)', () => {
  it('returns an order by id with selected fields only', async () => {
    const seeded = repoMock.__seed('alice', validItems, 25);
    const res = await gql(
      `query GetOrder($id: Int!) {
        order(id: $id) {
          id
          status
          total
        }
      }`,
      { id: seeded.id }
    );
    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.order).toEqual({
      id: seeded.id,
      status: 'pending',
      total: 25
    });
  });

  it('returns nested items[] when requested', async () => {
    const seeded = repoMock.__seed('alice', validItems, 25);
    const res = await gql(
      `query { order(id: ${seeded.id}) {
        id
        items { productId quantity unitPrice }
      } }`
    );
    expect(res.status).toBe(200);
    expect(res.body.data.order.items).toHaveLength(2);
    expect(res.body.data.order.items[0]).toEqual({
      productId: 'p1',
      quantity: 2,
      unitPrice: 10
    });
  });

  it('returns null for unknown id', async () => {
    const res = await gql(`query { order(id: 99999) { id } }`);
    expect(res.status).toBe(200);
    expect(res.body.data.order).toBeNull();
  });

  it('serialises createdAt as ISO string', async () => {
    const seeded = repoMock.__seed('alice', validItems, 25);
    const res = await gql(`query { order(id: ${seeded.id}) { createdAt } }`);
    expect(res.body.data.order.createdAt).toBe('2025-01-01T00:00:00.000Z');
  });
});

describe('GraphQL: query ordersByUser(userId)', () => {
  it('returns all orders for a user', async () => {
    repoMock.__seed('alice', validItems, 25);
    repoMock.__seed('alice', validItems, 30);
    repoMock.__seed('bob', validItems, 99);

    const res = await gql(
      `query ListMy($u: String!) {
        ordersByUser(userId: $u) { id userId total }
      }`,
      { u: 'alice' }
    );
    expect(res.status).toBe(200);
    expect(res.body.data.ordersByUser).toHaveLength(2);
    expect(
      res.body.data.ordersByUser.every((o: { userId: string }) => o.userId === 'alice')
    ).toBe(true);
  });

  it('returns empty array for a user with no orders', async () => {
    const res = await gql(`query { ordersByUser(userId: "ghost") { id } }`);
    expect(res.status).toBe(200);
    expect(res.body.data.ordersByUser).toEqual([]);
  });
});

describe('GraphQL: schema validation', () => {
  it('rejects unknown fields with a GraphQL error', async () => {
    const res = await gql(`query { order(id: 1) { id nonExistentField } }`);
    // GraphQL validation errors come back with status 400
    expect([200, 400]).toContain(res.status);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].message).toMatch(/nonExistentField/);
  });

  it('rejects missing required argument', async () => {
    const res = await gql(`query { order { id } }`);
    expect(res.body.errors).toBeDefined();
  });
});
