# System Design

## One-Line System

Temporary resource rooms shared through capability links.

```txt
Share link = permission
Resource = uploaded file/text/object
Expiry = automatic cleanup boundary
```

## Frontend Mental Model

Think of the backend state like frontend arrays:

```js
const shares = [];
const resources = [];
const auditEvents = [];
```

A resource belongs to a share through `shareId`:

```js
const share = { id: "share_123", mode: "upload" };
const resource = { id: "res_456", shareId: "share_123", name: "video.mp4" };
```

The backend exists to keep those arrays correct, store file bytes safely, and enforce permissions.

## High-Level Architecture

```txt
Browser
  -> Share page UI
  -> API server
  -> Permission check
  -> Metadata store
  -> Object storage

Cleanup worker
  -> finds expired shares/resources
  -> deletes object bytes
  -> marks metadata deleted
```

## First Implementation Architecture

The first implementation stays simple:

```txt
Frontend: static HTML/CSS/JS
API server: Node.js
Metadata: JSON files
Storage: local disk
Cleanup: simple Node interval or command
```

This is intentionally simple so each concept is visible.

## Production-Learning Architecture

Later architecture:

```txt
Frontend: React or Next.js
API server: Node.js with Fastify/Express
Metadata DB: Postgres
Object storage: S3/R2/MinIO/local abstraction
Cache/rate limit: Redis
Workers: cleanup and async processing
Deployment: Docker
```

## Core Components

### 1. Share Page

Public page opened by guests.

Responsibilities:

- Load share metadata.
- Show permission mode.
- Show resource list.
- Upload resources when allowed.
- Preview resources when supported.
- Download resources when allowed.
- Hide UI actions that are not allowed.

Important: hiding UI is not enough. The API server must enforce permissions.

### 2. API Server

The API server is the gatekeeper.

Responsibilities:

- Parse requests.
- Validate share link.
- Check permission.
- Write metadata.
- Stream upload bytes into storage.
- Stream download bytes from storage.
- Write audit events.

### 3. Metadata Store

Metadata store remembers what exists.

It stores:

- Shares.
- Resources.
- Permissions.
- Expiry.
- Audit events.

It does not store actual video/audio/PDF bytes.

### 4. Object Storage

Object storage stores bytes.

Examples:

- Local disk during development.
- MinIO for local S3-like learning.
- Cloudflare R2.
- AWS S3.

Object storage should expose a simple internal interface:

```txt
put(storageKey, stream)
get(storageKey)
delete(storageKey)
exists(storageKey)
```

### 5. Cleanup Worker

The cleanup worker makes the system temporary.

Responsibilities:

- Find expired shares.
- Find expired resources.
- Delete file bytes from storage.
- Mark metadata deleted.
- Record audit events.

## Core Data Model

### Share

```txt
id
name
accessMode
expiresAt
revokedAt
maxResourceBytes
maxTotalBytes
createdAt
updatedAt
```

Access modes:

```txt
readonly
upload
edit
```

### Resource

```txt
id
shareId
originalName
mimeType
size
checksum
storageKey
previewType
metadata
expiresAt
deletedAt
createdAt
updatedAt
```

### AuditEvent

```txt
id
shareId
resourceId
action
ip
userAgent
createdAt
```

## Upload Flow

```txt
Guest selects file
  -> frontend sends upload request
  -> API validates share
  -> API checks upload permission
  -> API checks size/quota
  -> API streams bytes into object storage
  -> API writes resource metadata
  -> API records audit event
  -> frontend refreshes list
```

Key idea:

```txt
File bytes go to object storage.
File information goes to metadata store.
```

## Download Flow

```txt
Guest clicks download
  -> API validates share
  -> API checks download permission
  -> API loads resource metadata
  -> API streams bytes from object storage
```

The server should stream the file instead of loading the whole file into memory.

## Preview Flow

```txt
Guest clicks preview
  -> API validates share
  -> API checks preview permission
  -> API loads metadata
  -> frontend chooses preview component
```

Preview mapping:

```txt
image/*          <img>
video/*          <video controls>
audio/*          <audio controls>
application/pdf  iframe/object PDF viewer
text/*           escaped text viewer
text/html        escaped or sandboxed viewer
unknown          metadata panel
```

Security note: uploaded HTML must not run as trusted app code.

## Expiry Flow

```txt
Share reaches expiresAt
  -> API rejects new actions
  -> cleanup worker finds expired share
  -> worker deletes resource bytes
  -> worker marks metadata deleted
```

We should prefer soft delete in metadata first:

```txt
deletedAt = timestamp
```

This helps debug cleanup failures.

## Permission Model

Permission is attached to the share link.

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

The backend must check permissions on every route.

## Why Postgres Later

Postgres is useful when we move beyond JSON files because:

- Resources belong to shares.
- Audit events belong to shares/resources.
- Expiry cleanup needs indexed queries.
- Quotas need aggregation.
- Foreign keys can prevent orphan metadata.

We can still keep flexible per-file metadata using a JSONB column.

## Main Risks

### Abuse

No-login uploads can attract spam or unsafe files.

Mitigations:

- Short expiry.
- Max file size.
- Max total share size.
- Rate limits.
- File type rules.
- Malware scanning later.

### Unsafe Preview

Uploaded HTML/code can be dangerous if executed.

Mitigations:

- Escape text previews.
- Sandbox HTML.
- Use separate preview domain later.

### Storage Cost

Large uploads and downloads cost money.

Mitigations:

- Expiry.
- Quotas.
- Cleanup worker.
- Download limits later.

## Phase Plan

```txt
Phase 0: requirements and design docs
Phase 1: clean routes and domain model
Phase 2: preview system
Phase 3: expiry and cleanup
Phase 4: Postgres metadata
Phase 5: storage abstraction
Phase 6: rate limits and quotas
Phase 7: multipart upload
Phase 8: Docker deployment
```
