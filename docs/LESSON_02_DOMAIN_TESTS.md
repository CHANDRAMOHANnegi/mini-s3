# Lesson 02: Domain Tests

Before adding routes, we test the domain helpers.

This keeps the project understandable:

```txt
Domain logic first
API routes second
Storage/database third
```

## Why Test Domain Logic First

Routes will eventually do many things:

```txt
parse request
find share
check permission
check expiry
write/read storage
return response
```

If permission or expiry logic is wrong, every route becomes risky.

So we test small helpers before they are used by the server.

## What We Test

### Permission Rules

```txt
readonly -> list, preview, download
upload   -> list, preview, download, upload
edit     -> list, preview, download, upload, delete
```

This is the heart of the no-login link model.

### Expiry Rules

If a share or resource is expired, it should become inactive.

```txt
expired share -> no upload, no preview, no download
```

### Share Creation

Creating a share should produce:

```txt
id
name
accessMode
permissions
createdAt
expiresAt
```

Default mode is `upload` because it is safer than `edit` and more useful than `readonly`.

### Resource Creation

Creating a resource should connect it to a share:

```txt
resource.shareId = share.id
```

It should also generate:

```txt
resource id
storage key
preview type
checksum
```

## Frontend Mental Model

Think of this like testing pure frontend functions:

```js
canAccess("upload", "delete") === false
previewTypeForMime("video/mp4") === "video"
```

These tests do not need a server or database.

That is why they are fast and easy to understand.

## Command

```bash
npm test
```

The test file is:

```txt
src/domain/domain.test.ts
```
