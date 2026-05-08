# service-notifications

Notifications service. Sends email/SMS/push messages, validates recipients.

## Setup

```bash
npm install
npm run build
npm test
```

## Scripts

- `npm run lint` — ESLint static analysis
- `npm test` — run unit tests with coverage
- `npm run build` — compile TypeScript to `dist/`
- `npm start` — run compiled service

## Logging

Uses Winston. Set `LOG_LEVEL` env var (default: `info`). In production
(`NODE_ENV=production`) logs are emitted as JSON; otherwise as colorized text.
