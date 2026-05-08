export interface RouteRule {
  prefix: string;
  target: string;
  service: string;
}

/**
 * Resolve which backend service a request should be proxied to.
 * Picks the route with the longest matching prefix.
 */
export function resolveRoute(path: string, rules: RouteRule[]): RouteRule | null {
  let best: RouteRule | null = null;
  for (const rule of rules) {
    if (path.startsWith(rule.prefix)) {
      if (!best || rule.prefix.length > best.prefix.length) {
        best = rule;
      }
    }
  }
  return best;
}

/**
 * Strip the matched prefix from a path so the upstream service receives
 * a clean URL. e.g. /auth/login → /login
 */
export function rewritePath(path: string, prefix: string): string {
  if (!path.startsWith(prefix)) return path;
  const remainder = path.slice(prefix.length);
  if (remainder === '' || remainder === '/') return '/';
  if (!remainder.startsWith('/')) return '/' + remainder;
  return remainder;
}
