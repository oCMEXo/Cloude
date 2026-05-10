import { resolveRoute, rewritePath, RouteRule } from './routing';

const rules: RouteRule[] = [
  { prefix: '/auth', target: 'http://auth:3001', service: 'auth' },
  { prefix: '/orders', target: 'http://orders:3002', service: 'orders' },
  { prefix: '/notifications', target: 'http://notif:3003', service: 'notif' }
];

describe('resolveRoute', () => {
  it('matches a request to its service by prefix', () => {
    const r = resolveRoute('/auth/login', rules);
    expect(r?.service).toBe('auth');
  });

  it('matches a request to a different service', () => {
    const r = resolveRoute('/orders/123', rules);
    expect(r?.service).toBe('orders');
  });

  it('returns null for unmatched path', () => {
    expect(resolveRoute('/unknown/foo', rules)).toBeNull();
  });

  it('matches the root of a prefix', () => {
    const r = resolveRoute('/auth', rules);
    expect(r?.service).toBe('auth');
  });

  it('picks the longest matching prefix', () => {
    const moreRules: RouteRule[] = [
      ...rules,
      { prefix: '/orders/admin', target: 'http://admin:9000', service: 'admin' }
    ];
    const r = resolveRoute('/orders/admin/foo', moreRules);
    expect(r?.service).toBe('admin');
  });

  it('does not partially match a non-segment prefix', () => {
    const r = resolveRoute('/authenticated', rules);
    expect(r?.service).toBe('auth');
  });
});

describe('rewritePath', () => {
  it('strips the matched prefix', () => {
    expect(rewritePath('/auth/login', '/auth')).toBe('/login');
  });

  it('returns / when path equals prefix', () => {
    expect(rewritePath('/auth', '/auth')).toBe('/');
  });

  it('returns / when path is prefix with trailing slash', () => {
    expect(rewritePath('/auth/', '/auth')).toBe('/');
  });

  it('preserves query-like path segments', () => {
    expect(rewritePath('/orders/123/status', '/orders')).toBe('/123/status');
  });

  it('returns path unchanged if prefix does not match', () => {
    expect(rewritePath('/foo/bar', '/auth')).toBe('/foo/bar');
  });
});
