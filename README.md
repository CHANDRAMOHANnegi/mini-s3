# Mini S3

A small S3-like temporary resource sharing service.

The product idea is simple:

```txt
create a share link
  -> send URL to someone
  -> they upload, preview, download, or delete from that link
```

No guest login. The URL is the capability.

## Run Locally

```bash
npm install
npm run dev
```

Open:

```txt
http://localhost:8787
```

Do not open `public/index.html` through Live Server. The UI must be served by the Express app because it calls the same origin API.

## Scripts

```bash
npm test       # run Node test suite
npm run check # TypeScript typecheck
npm run build # compile to dist/
npm run dev   # run TypeScript server
npm start     # run compiled server
```

## What Works Now

```txt
share creation
clean /s/share_xxx links
full resource access for everyone with the link
browser UI
multipart file upload
resource listing
preview route
download route
delete route
expiry enforcement
local object storage
JSON metadata persistence
cleanup scheduler for expired resources
optional admin token for share creation
```

## Link Behavior

```txt
anyone with /s/share_xxx can:
  upload
  list
  preview
  download
  delete
```

Safety comes from short expiry, random unguessable ids, file-size limits, and cleanup.

## API

Create a share:

```http
POST /api/shares
content-type: application/json

{
  "name": "Project dropbox",
  "expiresInHours": 24,
  "maxResourceBytes": 104857600
}
```

Open a share:

```http
GET /api/shares/:shareId
```

List resources:

```http
GET /api/shares/:shareId/resources
```

Upload a file:

```http
POST /api/shares/:shareId/resources
content-type: multipart/form-data

file=<bytes>
```

Preview:

```http
GET /api/shares/:shareId/resources/:resourceId/preview
```

Download:

```http
GET /api/shares/:shareId/resources/:resourceId/download
```

Delete:

```http
DELETE /api/shares/:shareId/resources/:resourceId
```

Delete works for active share links.

If `ADMIN_TOKEN` is configured, automatic link creation must include:

```txt
x-admin-token: <token>
```

## Browser Routes

```txt
/           create/open share UI
/s/:shareId open or create a share UI
```

Example:

```txt
http://localhost:8787/s/share_xxx
```

## Storage Layout

```txt
storage/
  objects/
    shares/
      <shareId>/
        resources/
          <resourceId>
  meta/
    shares.json
    resources.json
```

Bytes and metadata are intentionally separate.

```txt
bytes    -> ObjectStorage
metadata -> ShareStore / ResourceStore
```

This lets us swap implementations later:

```txt
local disk -> S3/R2/MinIO
JSON file  -> Postgres
```

## Cleanup

The server starts a cleanup scheduler.

Default interval:

```txt
5 minutes
```

Override:

```bash
CLEANUP_INTERVAL_MS=60000 npm run dev
```

Cleanup scans resources, removes expired bytes, and marks expired metadata deleted.

## Optional Admin Token

Guests do not log in.

But public deployments can protect share creation:

```bash
ADMIN_TOKEN=secret npm run dev
```

Then only `POST /api/shares` requires:

```txt
x-admin-token: secret
```

Existing share links still work without login.

## Learning Docs

The implementation is split into lessons:

```txt
docs/LESSON_01_DOMAIN_MODEL.md
...
docs/LESSON_17_BROWSER_UI.md
docs/LESSON_18_ADMIN_TOKEN.md
docs/LESSON_19_LINK_FIRST_FULL_ACCESS.md
```

Start with:

```txt
docs/REQUIREMENTS.md
docs/SYSTEM_DESIGN.md
docs/API_DESIGN.md
docs/IMPLEMENTATION_PLAN.md
```

## Current Limitations

This is a strong learning MVP, not production S3.

Important gaps:

```txt
no Postgres yet
no rate limiting yet
no malware scanning
no direct-to-object-storage upload
no resumable large uploads
no distributed cleanup lock
no Docker/deployment config yet
```

## Production Direction

Next production steps:

```txt
Postgres for metadata
object storage provider: S3/R2/MinIO
rate limiting
admin token for creating shares
Dockerfile
deployment docs
structured logs
request ids
```
