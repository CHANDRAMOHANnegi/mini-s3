# Requirements

## Product Goal

Build temporary no-login resource sharing.

An owner creates a share link, chooses what that link can do, sends it to someone, and resources disappear after a short lifetime.

```txt
Owner creates link
  -> guest opens link
  -> guest uploads/previews/downloads based on permission
  -> system deletes expired resources later
```

This is not permanent cloud drive storage. It is short-lived resource sharing.

## Roles

Owner/admin:

- Creates share links.
- Chooses permission mode.
- Sets expiry.
- Sets file limits.
- Revokes links.
- Manages uploaded resources.

Guest:

- Opens a share link.
- Does not log in.
- Interacts only with what the link allows.

## Functional Requirements

### 1. Create Share Link

The owner can create a temporary share link.

Inputs:

- Name.
- Permission mode.
- Expiry time.
- Max file size.
- Optional max total storage.

Output:

- Share URL.
- Share ID.
- Expiry information.

### 2. Upload Any Resource

Guests with upload permission can upload resource bytes.

Supported examples:

- Video.
- Audio.
- Images.
- PDF.
- Docs.
- Text files.
- HTML files.
- JSON/code files.
- Archives.
- Plain text snippets.
- Emoji text.
- Unknown binary files.

The system stores every upload as a resource object.

Resource metadata:

```txt
id
shareId
originalName
mimeType
size
checksum
storageKey
createdAt
expiresAt
deletedAt
```

The actual file bytes do not live in the metadata database.

### 3. List Resources

Guests with list permission can see resources inside the share.

The list should show:

- File name.
- Type.
- Size.
- Created time.
- Expiry time.
- Preview availability.

### 4. Preview Resource

Guests with preview permission can preview supported types.

Preview behavior:

```txt
image/*          image preview
video/*          video player
audio/*          audio player
application/pdf  PDF preview
text/plain       escaped text preview
text/html        escaped or sandboxed preview
unknown          metadata only
```

HTML must not execute inside the main app page. It should be escaped, sandboxed, or served from an isolated preview origin later.

### 5. Download Resource

Guests with download permission can download resources.

The system must check:

- Share exists.
- Share is not expired.
- Share is not revoked.
- Resource exists.
- Resource is not deleted.
- Link allows download.

### 6. Delete Resource

Guests can delete resources only if the link has edit permission.

Owner/admin can delete resources through management controls.

### 7. Expire Resources

Every share and resource must expire.

Rules:

- Default expiry should be short, such as 24 hours.
- Maximum expiry should be limited, such as 7 or 30 days.
- Expired resources should become inaccessible.
- A cleanup worker should delete expired file bytes from storage.

### 8. Revoke Share

Owner/admin can revoke a share before expiry.

After revocation:

- The share page should stop working.
- Upload/download/preview should fail.
- Cleanup worker can remove resources.

### 9. Audit Actions

The system should record important actions:

- Share created.
- Resource uploaded.
- Resource previewed.
- Resource downloaded.
- Resource deleted.
- Share expired.
- Share revoked.

Audit fields:

```txt
id
shareId
resourceId
action
ip
userAgent
createdAt
```

## Non-Functional Requirements

### Availability

The service should stay available while users upload and download resources.

First version can be a single app server. Later versions should support multiple stateless API servers.

### Durability

Uploaded resources should not be lost before their expiry time.

Later versions should use durable object storage instead of only local disk.

### Security

Security comes from capability links and guardrails.

Requirements:

- Unguessable share IDs or secret tokens.
- HTTPS in production.
- Server-side permission checks.
- File size limits.
- Share quotas.
- Rate limits.
- Abuse prevention.
- Safe preview handling.

### Performance

Large downloads should not block the server in memory.

The backend should stream uploads and downloads rather than loading whole files into memory.

### Scalability

The architecture should allow:

- Multiple API servers.
- Shared metadata database.
- Shared object storage.
- Background cleanup workers.
- CDN later for downloads/previews.

### Observability

The system should expose:

- Logs.
- Health endpoint.
- Upload/download failures.
- Cleanup worker activity.
- Storage usage.

## Out Of Scope For First Version

- Payments.
- Permanent storage.
- User accounts for guests.
- Real-time collaboration.
- Full malware scanning.
- Full CDN setup.
- Multi-region deployment.

## MVP Definition

The MVP is complete when:

- Owner can create a temporary share link.
- Guest can open the link without login.
- Guest can upload at least one resource.
- Guest can list resources.
- Guest can preview common types.
- Guest can download resources.
- Permissions are checked on the server.
- Expired shares/resources stop working.
- Cleanup can remove expired files.
