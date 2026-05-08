import request from 'supertest';
import { createApp, ROUTES } from './app';

const app = createApp();

describe('GET /health', () => {
  it('returns gateway status with route info', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('api-gateway');
    expect(Array.isArray(res.body.routes)).toBe(true);
    expect(res.body.routes.length).toBe(ROUTES.length);
  });

  it('lists all configured services in routes', () => {
    const services = ROUTES.map((r) => r.service);
    expect(services).toContain('service-auth');
    expect(services).toContain('service-orders');
    expect(services).toContain('service-notifications');
  });
});

describe('Unmatched routes', () => {
  it('returns 404 with path information', async () => {
    const res = await request(app).get('/no-such-prefix');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeTruthy();
    expect(res.body.path).toBe('/no-such-prefix');
  });
});

describe('ROUTES configuration', () => {
  it('has unique prefixes', () => {
    const prefixes = ROUTES.map((r) => r.prefix);
    expect(new Set(prefixes).size).toBe(prefixes.length);
  });

  it('every route has a non-empty target URL', () => {
    for (const route of ROUTES) {
      expect(route.target).toMatch(/^https?:\/\//);
    }
  });
});
