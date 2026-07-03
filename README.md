# Mini S3 Share Storage

A tiny S3-like object storage service with Codeshare-style public links.

It lets you create a share URL like:

```txt
http://localhost:8787/s/<shareId>
```

Anyone with that URL can interact with that share space according to the permission mode you choose.

Guests do not need an account. The link is the permission.

## Mental Model

Real S3 gives you buckets and objects.

This project gives you:

```txt
Share URL = a small bucket-like space
Object key = file/resource path inside that share
Resource URL = direct URL to one uploaded object
Metadata = size, type, checksum, created time
Permission mode = what the link holder can do
```

Example:

```txt
/s/abc123
  people use this page to upload/list files

/r/abc123/demo.pdf
  direct URL to one uploaded resource
```

## Run Locally

```bash
npm run dev
```

Then open:

```txt
http://localhost:8787
```

Create a share, copy the generated URL, and send it to someone on the same network or hosted domain.

## Planning Preview

Open this standalone HTML file to discuss the product UI before changing the real app:

```txt
docs/previews/ui-preview.html
```

It previews the owner flow, guest upload flow, resource list, permissions, preview surface, download/delete actions, and audit trail.

## Product Direction

This should feel like Codeshare or document link sharing, not like a login-heavy storage dashboard.

```txt
Owner/admin
  creates a share link
  chooses readonly, upload, or edit
  can revoke/expire the link

Guest
  opens the link
  immediately interacts with resources
  does not sign up
  does not log in
```

The production rule is: **no login wall for guests**. Use login or an admin secret only for the person managing shares.

## Permission Modes

Each share URL is a capability link. Whoever has the URL gets that link's permissions without logging in.

```txt
readonly
  list resources
  download resources
  cannot upload
  cannot delete

upload
  list resources
  download resources
  upload new resources
  cannot delete

edit
  list resources
  download resources
  upload resources
  delete resources
```

For public hosting, the safest default is `upload`. People can contribute files, but they cannot delete other files.

## API

Create a share:

```http
POST /api/shares
content-type: application/json

{
  "name": "Project dropbox",
  "accessMode": "upload",
  "expiresInHours": 24,
  "maxObjectBytes": 104857600
}
```

Upload an object:

```http
PUT /api/shares/:shareId/objects/:objectKey
content-type: application/octet-stream

<raw file bytes>
```

List objects:

```http
GET /api/shares/:shareId/objects
```

Download an object:

```http
GET /r/:shareId/:objectKey
```

Delete an object:

```http
DELETE /api/shares/:shareId/objects/:objectKey
```

This only works when the share was created with:

```json
{
  "accessMode": "edit"
}
```

## Storage Layout

Uploaded files are stored on disk:

```txt
storage/
  shares.json
  objects/
    <shareId>/
      file.pdf
  meta/
    <shareId>/
      file.pdf.json
```

The file bytes and metadata are separate, just like real object storage separates object data from object metadata/indexing.

## Hosting Notes

For a real public deployment, do not expose unlimited anonymous upload without guardrails.

Add these before using it seriously:

- Admin login or admin secret for creating and revoking share links.
- No guest login; guest access should remain link-based.
- Random unguessable share IDs, already included here.
- Expiry, already included here.
- Max file size, already included here.
- Rate limiting per IP.
- Malware scanning for uploaded files.
- File type rules.
- Private admin token for creating edit links.
- Durable storage volume or cloud disk.
- HTTPS.
- Backups.

## How This Maps To S3

This project is not production S3, but it teaches the same core shape:

```txt
Client
  -> gets a share/upload URL
  -> uploads bytes
  -> storage saves object by key
  -> metadata records object details
  -> resource URL serves the object later
```

Production S3 adds much harder pieces: replication, partitioning, lifecycle rules, versioning, encryption, IAM, consistency guarantees, audits, and repair jobs.

## Next Improvements

- Multipart upload for large files.
- Presigned upload/download URLs.
- Object versioning.
- Per-share permissions.
- Background cleanup for expired shares.
- S3-compatible API shape.
- Dockerfile for deployment.
