# Lesson 05: API Tests

Domain tests check pure logic.

API tests check the real HTTP behavior.

## Why API Tests Matter

For `POST /api/shares`, we need to know the whole path works:

```txt
HTTP request
  -> Express route
  -> createShare()
  -> shareStore.create()
  -> HTTP response
```

If any wiring is wrong, domain tests will not catch it.

## Tool

We use `supertest`.

Supertest can call the Express app directly:

```ts
await request(app).post("/api/shares").send({ name: "Client upload" });
```

It does not need us to start a real port.

## Current API Tests

```txt
GET  /health
POST /api/shares
GET  /api/shares/:shareId
GET  /api/shares/:shareId for missing share
unknown route error shape
```

## Why We Inject The Store

Each test creates a fresh memory store:

```ts
createApp({ shareStore: createMemoryShareStore() })
```

That keeps tests isolated.

One test cannot accidentally depend on data from another test.

## Mental Model

Think of this as testing a frontend component with fake state.

```txt
create fresh app
create fresh store
send request
assert response
```

Later when we replace memory store with Postgres, we can keep most route behavior the same.
