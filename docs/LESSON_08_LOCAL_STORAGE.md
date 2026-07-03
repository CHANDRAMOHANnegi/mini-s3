# Lesson 08: Local Object Storage

Now we added the storage layer.

## Why Storage Layer Exists

Resource metadata and file bytes are different things.

```txt
Resource metadata
  -> name, size, mimeType, storageKey

File bytes
  -> actual video/audio/pdf/text contents
```

The metadata lives in stores/database.

The bytes live in object storage.

## Storage Interface

```txt
src/storage/storage.ts
```

The app will talk to this interface:

```txt
put(key, bytes)
get(key)
getStream(key)
delete(key)
exists(key)
```

## Local Implementation

```txt
src/storage/localStorage.ts
```

This stores bytes on local disk.

Example key:

```txt
shares/share_123/resources/res_456
```

Local disk path:

```txt
storage/objects/shares/share_123/resources/res_456
```

## Why Use An Interface

Later, local disk can become:

```txt
AWS S3
Cloudflare R2
MinIO
```

But the rest of the app should not care.

The route should only know:

```txt
storage.put(resource.storageKey, bytes)
```

## Safety Detail

The local storage implementation rejects path traversal keys.

Bad key:

```txt
../outside
```

Why?

Because a malicious key should never write outside the storage folder.

## What Came Next

The API route now accepts multipart uploads.

```txt
POST /api/shares/:shareId/resources
field name: file
```

Flow:

```txt
request file bytes
  -> create resource metadata
  -> storage.put(resource.storageKey, bytes)
  -> resourceStore.create(resource)
```
