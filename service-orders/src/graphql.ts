import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import express from 'express';
import { logger } from './logger';
import { getOrder, listByUser } from './repository';

/**
 * GraphQL implementation that replaces the following REST GET endpoints:
 *   - GET /orders/:id        ->  query order(id: Int!)
 *   - GET /orders?userId=... ->  query ordersByUser(userId: String!)
 *
 * Why GraphQL here?
 * The Order type has many fields (id, userId, total, status, items[], createdAt)
 * and `items` is itself a list of objects. With REST the client always gets
 * everything. With GraphQL the client picks exactly which fields it needs,
 * which is the textbook example of avoiding over-fetching.
 */

const typeDefs = `#graphql
  type OrderItem {
    productId: String!
    quantity: Int!
    unitPrice: Float!
  }

  enum OrderStatus {
    pending
    paid
    shipped
    delivered
    cancelled
  }

  type Order {
    id: Int!
    userId: String!
    total: Float!
    status: OrderStatus!
    items: [OrderItem!]!
    createdAt: String!
  }

  type Query {
    """Fetch a single order by id. Replaces GET /orders/:id."""
    order(id: Int!): Order

    """List all orders for a user. Replaces GET /orders?userId=..."""
    ordersByUser(userId: String!): [Order!]!
  }
`;

const resolvers = {
  Query: {
    order: async (_parent: unknown, args: { id: number }) => {
      logger.info('GraphQL query: order', { orderId: args.id });
      return getOrder(args.id);
    },
    ordersByUser: async (_parent: unknown, args: { userId: string }) => {
      logger.info('GraphQL query: ordersByUser', { userId: args.userId });
      return listByUser(args.userId);
    }
  },
  Order: {
    // Postgres returns Date — GraphQL is happiest serialising it to ISO string
    createdAt: (parent: { createdAt: Date }) =>
      parent.createdAt instanceof Date
        ? parent.createdAt.toISOString()
        : String(parent.createdAt)
  }
};

/**
 * Mounts the GraphQL endpoint at /graphql on the given Express app.
 * Must be awaited before app.listen() because Apollo needs async startup.
 */
export async function attachGraphQL(app: express.Express): Promise<void> {
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  app.use('/graphql', express.json(), expressMiddleware(server));
  logger.info('GraphQL endpoint mounted at /graphql');
}
