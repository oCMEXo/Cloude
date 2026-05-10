export interface RouteRule {
  prefix: string;
  target: string;
  service: string;
}

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

export function rewritePath(path: string, prefix: string): string {
  if (!path.startsWith(prefix)) return path;
  const remainder = path.slice(prefix.length);
  if (remainder === '' || remainder === '/') return '/';
  if (!remainder.startsWith('/')) return '/' + remainder;
  return remainder;
}
