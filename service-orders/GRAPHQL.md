# GraphQL sample queries — service-orders

The GraphQL endpoint is mounted at **`http://localhost:3002/graphql`**
(direct to the service) or **`http://localhost:8080/orders/graphql`**
(through the API gateway, if you proxy it).

When you open `/graphql` in a browser, Apollo Sandbox / Apollo Landing Page
loads automatically — same idea as Banana Cake Pop or GraphiQL.

## What is exposed via GraphQL

Two GET endpoints from the REST API are now also available as GraphQL queries:

| REST                                  | GraphQL                              |
|---------------------------------------|--------------------------------------|
| `GET /orders/:id`                     | `query { order(id: 1) { ... } }`     |
| `GET /orders?userId=alice`            | `query { ordersByUser(userId: "alice") { ... } }` |

The POST/PATCH endpoints (`POST /orders`, `PATCH /orders/:id/status`)
were left as REST for now — mutations would be the natural GraphQL
equivalent and a sensible next step.

---

## Examples

### 1. Get one order, only the fields you need

```graphql
query {
  order(id: 1) {
    id
    status
    total
  }
}
```

With REST you would always get `userId`, `items`, `createdAt` etc. back
even if you only want `total`. This is the textbook over-fetching problem
that GraphQL solves.

### 2. Get the same order with nested items

```graphql
query {
  order(id: 1) {
    id
    total
    items {
      productId
      quantity
      unitPrice
    }
  }
}
```

### 3. Variables instead of inline values

```graphql
query GetOrder($id: Int!) {
  order(id: $id) {
    id
    status
    createdAt
  }
}
```

Variables JSON:
```json
{ "id": 1 }
```

### 4. List a user's orders

```graphql
query {
  ordersByUser(userId: "alice") {
    id
    total
    status
    createdAt
  }
}
```

### 5. Aliasing — fetch two orders in one request

```graphql
query {
  first:  order(id: 1) { id total }
  second: order(id: 2) { id total }
}
```

One round trip, two results. With REST this would be two HTTP calls.

---

## Try it from curl

```bash
curl -X POST http://localhost:3002/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ order(id: 1) { id total status } }"}'
```

---

## Schema introspection

GraphQL clients can fetch the schema directly — useful for autocompletion
in tools like Postman, Insomnia, or the Apollo Studio Explorer:

```graphql
{
  __schema {
    types {
      name
    }
  }
}
```
