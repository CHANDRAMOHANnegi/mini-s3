# Lesson 03: First API Route

The first real route is:

```http
POST /api/shares
```

It creates a `Share`.

## Why Start Here

Everything in this app happens inside a share.

```txt
No share -> no permission
No permission -> no upload/download/preview
```

So `POST /api/shares` is the root of the product.

## Request

```http
POST /api/shares
content-type: application/json
```

```json
{
  "name": "Client upload",
  "accessMode": "upload",
  "expiresInHours": 24,
  "maxResourceBytes": 104857600
}
```

## Response

```json
{
  "share": {
    "id": "share_...",
    "name": "Client upload",
    "accessMode": "upload",
    "permissions": {
      "list": true,
      "preview": true,
      "download": true,
      "upload": true,
      "delete": false
    }
  },
  "shareUrl": "/s/share_..."
}
```

## What Happens Internally

```txt
request body
  -> createShare()
  -> memory share store
  -> JSON response
```

For now, the store is in memory:

```txt
src/stores/shareStore.ts
```

That means shares disappear when the server restarts.

This is intentional for this learning step. Later we replace the memory store with Postgres.

## Why Memory Store First

We are separating two ideas:

```txt
Business concept: what is a share?
Persistence concept: where do shares live?
```

First we make the business concept clear. Then we upgrade persistence.

## New Routes

```txt
POST /api/shares
GET /api/shares/:shareId
```

`GET /api/shares/:shareId` lets us verify that the created share exists in the current server memory.
