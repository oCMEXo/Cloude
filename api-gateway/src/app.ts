import express, { Request, Response, NextFunction } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { logger } from './logger';
import { RouteRule } from './routing';

const AUTH_URL = process.env.AUTH_SERVICE_URL || 'http://service-auth:3001';
const ORDERS_URL = process.env.ORDERS_SERVICE_URL || 'http://service-orders:3002';
const NOTIFICATIONS_URL = process.env.NOTIFICATIONS_SERVICE_URL || 'http://service-notifications:3003';

export const ROUTES: RouteRule[] = [
  { prefix: '/auth', target: AUTH_URL, service: 'service-auth' },
  { prefix: '/orders', target: ORDERS_URL, service: 'service-orders' },
  { prefix: '/notifications', target: NOTIFICATIONS_URL, service: 'service-notifications' }
];

export function createApp(): express.Express {
  const app = express();

  app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.info('Gateway request', {
      method: req.method,
      path: req.path,
      ip: req.ip
    });
    next();
  });

  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'api-gateway',
      routes: ROUTES.map((r) => ({ prefix: r.prefix, service: r.service }))
    });
  });

  for (const rule of ROUTES) {
    app.use(
      rule.prefix,
      createProxyMiddleware({
        target: rule.target,
        changeOrigin: true,
        pathRewrite: { [`^${rule.prefix}`]: '' },
        on: {
          proxyReq: (_proxyReq, req) => {
            logger.debug('Proxying request', {
              method: req.method,
              originalPath: req.url,
              upstream: rule.service
            });
          },
          error: (err, _req, res) => {
            logger.error('Proxy error', { service: rule.service, err: err.message });
            const anyRes = res as import('http').ServerResponse;
            if (anyRes.writeHead && !anyRes.headersSent) {
              anyRes.writeHead(502, { 'Content-Type': 'application/json' });
              anyRes.end(JSON.stringify({ error: 'upstream service unavailable' }));
            }
          }
        }
      })
    );
  }

  app.use((req: Request, res: Response) => {
    logger.warn('Unmatched route', { method: req.method, path: req.path });
    res.status(404).json({ error: 'no matching route', path: req.path });
  });

  return app;
}
