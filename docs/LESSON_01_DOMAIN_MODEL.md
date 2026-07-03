# Lesson 01: Domain Model

Before implementation, we need clear nouns.

In frontend terms, think of this app as state:

```js
const shares = [];
const resources = [];
const auditEvents = [];
```

The backend is responsible for keeping this state correct and storing file bytes separately.

## Share

A share is a temporary room.

```js
const share = {
  id: "share_123",
  name: "Client upload",
  accessMode: "upload",
  expiresAt: "2026-07-04T10:00:00Z",
  revokedAt: null
};
```

The share controls:

- Who can interact.
- What actions are allowed.
- When access expires.
- Which resources belong together.

## Resource

A resource is anything uploaded inside a share.

Examples:

- Video.
- Audio.
- Image.
- PDF.
- Text.
- HTML.
- Unknown binary.

```js
const resource = {
  id: "res_456",
  shareId: "share_123",
  originalName: "demo.mp4",
  mimeType: "video/mp4",
  size: 1048576,
  storageKey: "shares/share_123/resources/res_456",
  createdAt: "2026-07-03T10:00:00Z",
  deletedAt: null
};
```

Important:

```txt
resource.shareId connects the resource to the share.
```

## Storage Object

The storage object is the actual file bytes.

Metadata:

```js
{
  originalName: "demo.mp4",
  mimeType: "video/mp4",
  size: 1048576
}
```

Actual bytes:

```txt
stored on disk or S3-like storage
```

Never confuse these:

```txt
Database/metadata = remembers what exists
Object storage = stores actual bytes
```

## Permission

Permission is attached to the link.

```js
const permissions = {
  readonly: ["list", "preview", "download"],
  upload: ["list", "preview", "download", "upload"],
  edit: ["list", "preview", "download", "upload", "delete"]
};
```

The frontend can hide buttons, but backend must enforce this.

Example:

```txt
If link is readonly:
  hide upload button in UI
  reject upload API on server
```

## Expiry

Expiry is what makes this product temporary.

```js
if (Date.now() > new Date(share.expiresAt).getTime()) {
  throw new Error("Share expired");
}
```

When expired:

- Guest cannot upload.
- Guest cannot preview.
- Guest cannot download.
- Cleanup worker can delete bytes.

## Audit Event

An audit event records what happened.

```js
const event = {
  id: "evt_789",
  shareId: "share_123",
  resourceId: "res_456",
  action: "resource.uploaded",
  createdAt: "2026-07-03T10:05:00Z"
};
```

Useful actions:

```txt
share.created
share.revoked
resource.uploaded
resource.previewed
resource.downloaded
resource.deleted
cleanup.resource_deleted
```

## Mental Map

```txt
Share
  has many Resources
  has many AuditEvents
  has Permission mode
  has Expiry

Resource
  belongs to one Share
  has Metadata
  points to one StorageObject
```

## Why This Matters

If these nouns are clear, the API and code become easier.

```txt
POST /api/shares
  creates a Share

POST /api/shares/:shareId/resources
  creates a Resource inside that Share

GET /api/shares/:shareId/resources/:resourceId/download
  downloads bytes for that Resource
```

The whole backend is mostly:

```txt
find share
check permission
find resource
read/write storage
record audit
```
