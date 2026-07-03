# Lesson 07: Resource Create Route

We added:

```http
POST /api/shares/:shareId/resources
```

For now, this creates **resource metadata only**.

It does not upload file bytes yet.

## Why Metadata First

A real upload has two parts:

```txt
1. Store bytes
2. Store metadata
```

Examples of metadata:

```txt
originalName
mimeType
size
previewType
storageKey
expiresAt
```

Before handling binary file streams, we prove the metadata flow works.

## Request

```json
{
  "originalName": "hello.txt",
  "mimeType": "text/plain",
  "size": 12,
  "metadata": {
    "note": "metadata only for now"
  }
}
```

## Flow

```txt
POST /api/shares/:shareId/resources
  -> find share
  -> reject if share missing
  -> reject if link cannot upload
  -> reject if resource is too large
  -> createResource()
  -> resourceStore.create()
  -> return resource
```

## Permission Check

Readonly links cannot create resources.

```txt
readonly -> 403 PERMISSION_DENIED
upload   -> allowed
edit     -> allowed
```

This is the first route where the link permission actively changes behavior.

## Size Check

The resource size is checked against:

```txt
share.maxResourceBytes
```

If resource is too large:

```txt
413 RESOURCE_TOO_LARGE
```

## What Comes Next

Next we add actual byte storage.

That means:

```txt
request body/file stream
  -> local storage
  -> resource metadata
```

We will probably use `multipart/form-data` later because browsers upload files that way.
