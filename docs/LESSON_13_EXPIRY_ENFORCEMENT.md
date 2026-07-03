# Lesson 13: Expiry Enforcement

Now expiry is enforced by the API.

Before this step, `expiresAt` existed in metadata.

Now routes actually check it.

## Share Expiry

When a share is expired, resource actions stop working.

Blocked actions:

```txt
list resources
upload
preview
download
delete
```

The API returns:

```txt
410 Gone
SHARE_EXPIRED
```

## Resource Expiry

When a resource is expired but the share is still active:

```txt
list resources -> hides the expired resource
preview        -> 410 RESOURCE_EXPIRED
download       -> 410 RESOURCE_EXPIRED
delete         -> 410 RESOURCE_EXPIRED
```

## Why 410 Instead Of 404

`404 Not Found` means:

```txt
this thing does not exist
```

`410 Gone` means:

```txt
this thing existed, but is no longer available
```

That matches temporary resource sharing better.

## Production Note

Expiry enforcement and cleanup are different jobs.

Enforcement:

```txt
block expired access at request time
```

Cleanup:

```txt
delete old bytes later in a background job
```

This step only adds enforcement.
