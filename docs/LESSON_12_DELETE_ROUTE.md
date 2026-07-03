# Lesson 12: Delete Route

Now `edit` links can delete resources.

## Route

```txt
DELETE /api/shares/:shareId/resources/:resourceId
```

## Permission Rule

Only this mode can delete:

```txt
edit
```

These cannot delete:

```txt
readonly
upload
```

## Flow

```txt
find share
  -> check delete permission
  -> find resource
  -> confirm resource belongs to this share
  -> delete bytes from ObjectStorage
  -> mark metadata as deleted
```

## Soft Delete Metadata

The resource row is not removed from the store.

Instead:

```txt
deletedAt = current time
```

This lets us keep audit/debug history later.

## Hard Delete Bytes

The actual uploaded file bytes are removed from storage.

Why?

Because this product keeps resources only temporarily.

Deleted files should stop consuming storage.
