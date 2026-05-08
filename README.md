# Azure Practice 5 — Docker Compose Microservices

Three Node.js/TypeScript microservices behind an Express API gateway, all
backed by PostgreSQL and orchestrated with Docker Compose.

## Architecture

```
        ┌─────────┐
        │  client │
        └────┬────┘
             │  http://localhost:8080
        ┌────▼────────┐
        │ api-gateway │   :8080
        └────┬────────┘
   ┌─────────┼─────────────────────┐
   │         │                     │
   ▼         ▼                     ▼
service-  service-          service-
 auth     orders          notifications
 :3001    :3002              :3003
   └─────────┴─────────┬───────────┘
                       ▼
                  ┌─────────┐
                  │postgres │  :5432
                  └─────────┘
```

All five containers share one bridge network `app-net`, defined in
`docker-compose.yml`. PostgreSQL data persists in a named volume
`postgres-data`.

## Quick start

```bash
# from the project root
cp .env.example .env
docker compose build
docker compose up
```

Wait for postgres to become healthy and the services to print
`listening` lines. Then open another terminal and try:

```bash
# gateway health
curl http://localhost:8080/health

# register a user (proxied through the gateway to service-auth)
curl -X POST http://localhost:8080/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","password":"secret123"}'

# create an order
curl -X POST http://localhost:8080/orders/orders \
  -H 'Content-Type: application/json' \
  -d '{"userId":"alice","items":[{"productId":"sku-1","quantity":2,"unitPrice":50}]}'

# queue a notification
curl -X POST http://localhost:8080/notifications/notifications \
  -H 'Content-Type: application/json' \
  -d '{"recipient":"alice@example.com","channel":"email","subject":"Hi","body":"Hello!"}'
```

To stop and remove containers:

```bash
docker compose down
```

To also wipe the database volume:

```bash
docker compose down -v
```

## What's in here

```
.
├── docker-compose.yml          # 5-container stack: postgres + 4 services
├── .env.example
├── api-gateway/                # Express reverse proxy (port 8080)
├── service-auth/               # users, login, JWT (port 3001)
├── service-orders/             # orders, totals, status state machine (port 3002)
└── service-notifications/      # email/sms/push, templating (port 3003)
```

Each service folder is self-contained:

```
<service>/
├── Dockerfile          # multi-stage build (build → runtime)
├── .dockerignore
├── package.json
├── tsconfig.json
├── jest.config.js
├── .eslintrc.json
├── azure-pipelines.yml # carried over from Practice 4
└── src/
    ├── server.ts       # entrypoint (boots HTTP listener)
    ├── app.ts          # Express app factory
    ├── logger.ts       # Winston setup
    ├── db.ts           # pg pool + schema init (where applicable)
    ├── repository.ts   # SQL queries (where applicable)
    ├── <domain>.ts     # pure business logic
    ├── <domain>.test.ts
    └── app.test.ts     # supertest integration tests
```

## API reference (via gateway)

| Method | Path                              | Description                       |
|--------|-----------------------------------|-----------------------------------|
| GET    | `/health`                         | Gateway status + route map        |
| POST   | `/auth/register`                  | Register user, returns JWT        |
| POST   | `/auth/login`                     | Login, returns JWT                |
| POST   | `/auth/verify`                    | Verify a JWT                      |
| POST   | `/orders/orders`                  | Create an order with items        |
| GET    | `/orders/orders/:id`              | Fetch order by id                 |
| GET    | `/orders/orders?userId=...`       | List orders for a user            |
| PATCH  | `/orders/orders/:id/status`       | Transition order state            |
| POST   | `/notifications/notifications`    | Send a notification               |
| GET    | `/notifications/notifications/:id`| Fetch a notification              |

The double `/orders/orders` is intentional — the gateway forwards
`/orders/*` to `service-orders`, which itself exposes its endpoints
under `/orders`. In a real product you'd usually rewrite paths so
the API surface looks cleaner, but keeping them as-is here makes the
proxy behavior obvious in logs.

## Running tests

Each service has its own test suite. From a service folder:

```bash
cd service-auth      # (or service-orders / service-notifications / api-gateway)
npm install
npm run lint
npm test
```

All tests use mocks for the database layer, so they run without docker.

| Service                | Tests | Coverage focus                      |
|------------------------|-------|-------------------------------------|
| service-auth           | 27    | hashing, JWT, validation, HTTP      |
| service-orders         | 39    | totals, discounts, state machine    |
| service-notifications  | 42    | recipient validation, templating    |
| api-gateway            | 16    | route resolution, path rewriting    |
| **Total**              | **124** |                                   |

## Logging

Every service uses Winston with structured fields:
- Service name (`service-auth`, `service-orders`, `service-notifications`, `api-gateway`)
- Log level (`info`, `warn`, `error`, `debug`)
- Request method and path on each HTTP entry
- Domain context (`username`, `orderId`, `recipient`, …) on relevant lines

In production (the default in containers) logs are emitted as JSON,
which Docker captures and you can read with:

```bash
docker compose logs -f api-gateway
docker compose logs -f service-auth
```

In local development (without `NODE_ENV=production`) logs are colorized text.

## Common issues

**Postgres "connection refused" on first startup.** Each service has a
retry loop that waits up to 20 seconds for the DB. If it gives up,
either docker took longer than usual to bring postgres online — just
re-run `docker compose up` — or the postgres container itself failed,
check with `docker compose logs postgres`.

**Port already in use.** Something else is listening on 8080 / 3001 /
3002 / 3003 / 5432. Either stop the other process or change the host
side of the port mapping in `docker-compose.yml` (e.g. `"18080:8080"`).

**Build is slow on first run.** The first build downloads the
`node:20-alpine` and `postgres:16-alpine` base images and installs all
npm dependencies. Subsequent builds use the layer cache and are much
faster.
