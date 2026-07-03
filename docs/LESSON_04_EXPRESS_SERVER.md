# Lesson 04: Express Server

We switched from Node's raw `http` module to Express.

## Why Express

Raw Node makes us manually do everything:

```txt
parse URL
check method
read JSON body
write status
write JSON response
handle errors
```

Express gives us a clearer route model:

```ts
app.post("/api/shares", async (req, res) => {
  const share = createShare(req.body);
  res.status(201).json({ share });
});
```

This is easier to understand from a frontend background because it looks like:

```txt
route path + handler function
```

## New Files

```txt
src/app.ts
src/server.ts
```

`src/app.ts` creates and configures the Express app.

`src/server.ts` only starts listening on a port.

This split matters because later tests can import `createApp()` without starting a real server.

## Current Routes

```txt
GET  /health
GET  /debug/sample-share
POST /api/shares
GET  /api/shares/:shareId
```

## Current Flow For Creating A Share

```txt
POST /api/shares
  -> Express parses JSON body
  -> createShare(req.body)
  -> memory share store saves it
  -> API returns share and shareUrl
```

## What Did Not Change

The domain model did not change.

```txt
Share
Resource
Permission
Expiry
```

Only the HTTP layer got cleaner.

That is important: frameworks should make wiring easier, not replace our business logic.
