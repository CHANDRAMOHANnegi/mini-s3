# Implementation Plan

We will build this slowly and keep every phase understandable.

The rule for this project:

```txt
Do not add a feature until the model behind it is clear.
```

## Current Product Shape

We are building temporary no-login resource sharing.

```txt
Owner creates a temporary share link
Guest opens link without login
Guest uploads/previews/downloads based on link permission
System deletes expired resources later
```

## Learning Order

### Step 1: Domain Model

Understand the main nouns:

```txt
Share
Resource
Permission
Expiry
AuditEvent
StorageObject
```

We should be able to explain these before writing more backend code.

### Step 2: API Shape

Understand why every route lives under a share:

```txt
/api/shares/:shareId/resources
```

Instead of generic routes:

```txt
/upload
/download
```

Reason: permission depends on the share link.

### Step 3: Clean MVP Routes

Refactor current routes toward the target API:

```txt
POST /api/shares
GET /api/shares/:shareId
GET /api/shares/:shareId/resources
POST /api/shares/:shareId/resources
GET /api/shares/:shareId/resources/:resourceId/download
DELETE /api/shares/:shareId/resources/:resourceId
```

Keep storage local disk and metadata JSON for now.

### Step 4: Preview

Add preview support:

```txt
image -> img
video -> video
audio -> audio
pdf -> browser PDF preview
text -> escaped text
html -> escaped or sandboxed
unknown -> metadata only
```

### Step 5: Expiry

Make temporary behavior real:

```txt
expired share stops accepting actions
expired resource cannot be downloaded
cleanup worker deletes file bytes
metadata records deletedAt
```

### Step 6: Postgres

Replace JSON metadata with Postgres:

```txt
shares table
resources table
audit_events table
```

Do not store file bytes in Postgres.

### Step 7: Storage Abstraction

Add a storage interface:

```txt
put
get
delete
exists
```

Then local disk can later become S3/R2/MinIO without changing business logic.

## Phase 1 Scope

Phase 1 should not include Postgres, Redis, Docker, or S3.

Phase 1 goal:

```txt
Make the current local app use the right domain model and API shape.
```

Phase 1 deliverables:

- Share model helper.
- Resource model helper.
- Permission check helper.
- Expiry check helper.
- Routes renamed around `shares/:shareId/resources`.
- Existing UI still works.
- Simple smoke test still passes.

## Phase 1 Non-Goals

Do not add yet:

- Database.
- Auth.
- Redis.
- S3.
- Multipart upload.
- Malware scanning.
- Production deployment.

Those come later.

## First Concept To Understand

Everything starts with this:

```txt
Share = temporary room
Resource = file/text/object inside that room
Permission = what this link can do
Expiry = when the room stops working
```

Example:

```js
const share = {
  id: "share_123",
  accessMode: "upload",
  expiresAt: "2026-07-04T10:00:00Z"
};

const resource = {
  id: "res_456",
  shareId: "share_123",
  originalName: "demo.mp4",
  mimeType: "video/mp4",
  storageKey: "shares/share_123/resources/res_456"
};
```

This is the whole system in seed form.
