# Lesson 09: Multipart Upload

Now `/api/shares/:shareId/resources` can accept real file bytes.

## Why Multipart

Browser file upload usually sends:

```txt
Content-Type: multipart/form-data
```

That request can carry:

```txt
file bytes
file name
mime type
extra form fields
```

So for our app, multipart is the natural format for upload.

## Route

```txt
POST /api/shares/:shareId/resources
```

Form field:

```txt
file
```

Example:

```txt
file = hello.txt
metadata = first real file
```

## Flow

```txt
find share
  -> check upload permission
  -> read uploaded file from request
  -> check maxResourceBytes
  -> create Resource metadata
  -> save bytes to ObjectStorage
  -> save metadata to ResourceStore
  -> return resource JSON
```

## Important Design Detail

We save bytes before metadata.

Why?

Because metadata points to:

```txt
resource.storageKey
```

If metadata is saved first and byte storage fails, the API could return a resource that cannot be downloaded.

## Current Limitation

We use memory upload parsing for now.

That means the full file is held in server memory before being written to storage.

This is okay for the learning phase.

Production should use streaming upload or direct-to-object-storage upload.
