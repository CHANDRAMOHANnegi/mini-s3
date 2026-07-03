# Mini S3

A small S3-like temporary resource sharing service.

The product idea is simple:

```txt
create a share link
  -> choose permission
  -> send URL to someone
  -> they upload, preview, download, or delete based on that link
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
permission modes: readonly, upload, edit
browser UI
multipart file upload
resource listing
preview route
download route
delete route for edit links
expiry enforcement
local object storage
JSON metadata persistence
cleanup scheduler for expired resources
```

## Permission Modes

```txt
readonly
  list
  preview
  download

upload
  list
  preview
  download
  upload

edit
  list
  preview
  download
  upload
  delete
```

## API

Create a share:

```http
POST /api/shares
content-type: application/json

{
  "name": "Project dropbox",
  "accessMode": "upload",
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

Delete works only for `edit` shares.

## Browser Routes

```txt
/           create/open share UI
/s/:shareId open a share UI
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

## Learning Docs

The implementation is split into lessons:

```txt
docs/LESSON_01_DOMAIN_MODEL.md
...
docs/LESSON_17_BROWSER_UI.md
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
no auth for share creation
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
