# API Design

## API Principles

Every resource action happens inside a share context.

Prefer:

```txt
/api/shares/:shareId/resources
```

Instead of:

```txt
/upload
/download
```

Because upload/download permission depends on the share link.

## Permission Checks

Every route should run the same basic checks:

```txt
1. Does the share exist?
2. Is the share expired?
3. Is the share revoked?
4. Does the share allow this action?
5. Does the resource exist, when needed?
6. Is the resource deleted or expired?
```

## Share Routes

### Create Share

```http
POST /api/shares
content-type: application/json
```

Request:

```json
{
  "name": "Client asset drop",
  "accessMode": "upload",
  "expiresInHours": 24,
  "maxResourceBytes": 104857600,
  "maxTotalBytes": 1073741824
}
```

Response:

```json
{
  "share": {
    "id": "share_123",
    "name": "Client asset drop",
    "accessMode": "upload",
    "expiresAt": "2026-07-04T10:00:00.000Z",
    "maxResourceBytes": 104857600,
    "maxTotalBytes": 1073741824
  },
  "shareUrl": "/s/share_123"
}
```

### Get Share

```http
GET /api/shares/:shareId
```

Response:

```json
{
  "share": {
    "id": "share_123",
    "name": "Client asset drop",
    "accessMode": "upload",
    "permissions": {
      "list": true,
      "preview": true,
      "download": true,
      "upload": true,
      "delete": false
    },
    "expiresAt": "2026-07-04T10:00:00.000Z"
  }
}
```

### Revoke Share

```http
POST /api/shares/:shareId/revoke
```

This is owner/admin only.

Response:

```json
{
  "ok": true
}
```

## Resource Routes

### List Resources

```http
GET /api/shares/:shareId/resources
```

Response:

```json
{
  "resources": [
    {
      "id": "res_123",
      "originalName": "demo.mp4",
      "mimeType": "video/mp4",
      "size": 1048576,
      "previewType": "video",
      "createdAt": "2026-07-03T10:00:00.000Z",
      "expiresAt": "2026-07-04T10:00:00.000Z"
    }
  ]
}
```

### Upload Resource

Simple upload route for Phase 1:

```http
POST /api/shares/:shareId/resources
content-type: multipart/form-data
```

Form fields:

```txt
file
```

Response:

```json
{
  "resource": {
    "id": "res_123",
    "shareId": "share_123",
    "originalName": "demo.mp4",
    "mimeType": "video/mp4",
    "size": 1048576,
    "previewType": "video"
  }
}
```

Raw-byte upload route can also exist later:

```http
PUT /api/shares/:shareId/resources/:resourceId/content
content-type: application/octet-stream
```

For large files, use multipart upload routes later.

### Get Resource Metadata

```http
GET /api/shares/:shareId/resources/:resourceId
```

Response:

```json
{
  "resource": {
    "id": "res_123",
    "originalName": "demo.mp4",
    "mimeType": "video/mp4",
    "size": 1048576,
    "checksum": "sha256...",
    "previewType": "video",
    "downloadUrl": "/api/shares/share_123/resources/res_123/download",
    "previewUrl": "/api/shares/share_123/resources/res_123/preview"
  }
}
```

### Preview Resource

```http
GET /api/shares/:shareId/resources/:resourceId/preview
```

Behavior depends on type:

```txt
image/video/audio/pdf -> stream bytes with safe content type
text/code/json        -> return escaped text or JSON wrapper
html                  -> escape or sandbox
unknown               -> return metadata or 415 unsupported preview
```

### Download Resource

```http
GET /api/shares/:shareId/resources/:resourceId/download
```

Response:

```txt
Streamed file bytes
```

Headers:

```txt
content-type: original mime type
content-length: resource size
content-disposition: attachment; filename="original-name.ext"
```

### Delete Resource

```http
DELETE /api/shares/:shareId/resources/:resourceId
```

Allowed only for edit links or owner/admin.

Response:

```json
{
  "ok": true
}
```

## Future Large File API

For large video/audio uploads:

### Init Multipart Upload

```http
POST /api/shares/:shareId/uploads/init
```

Request:

```json
{
  "originalName": "large-video.mp4",
  "mimeType": "video/mp4",
  "size": 5368709120
}
```

Response:

```json
{
  "uploadId": "upl_123",
  "partSize": 10485760
}
```

### Upload Part

```http
PUT /api/shares/:shareId/uploads/:uploadId/parts/:partNumber
```

Body:

```txt
Raw part bytes
```

### Complete Upload

```http
POST /api/shares/:shareId/uploads/:uploadId/complete
```

Response:

```json
{
  "resource": {
    "id": "res_123"
  }
}
```

## Error Shape

Use a consistent error format:

```json
{
  "error": {
    "code": "SHARE_EXPIRED",
    "message": "This share link has expired."
  }
}
```

Example codes:

```txt
SHARE_NOT_FOUND
SHARE_EXPIRED
SHARE_REVOKED
PERMISSION_DENIED
RESOURCE_NOT_FOUND
RESOURCE_TOO_LARGE
QUOTA_EXCEEDED
UNSUPPORTED_PREVIEW
SERVER_ERROR
```

## Health Route

```http
GET /health
```

Response:

```json
{
  "ok": true
}
```

## First Implementation Choice

The current code may still use simple raw upload internally.

But the target public API should move toward:

```txt
POST /api/shares/:shareId/resources
```

This keeps the API easy to understand: resources always belong to a share.
