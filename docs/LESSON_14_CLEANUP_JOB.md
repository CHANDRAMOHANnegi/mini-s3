# Lesson 14: Cleanup Job

Now we have cleanup logic.

Expiry enforcement and cleanup are different.

## Enforcement

Enforcement happens during API requests.

Example:

```txt
expired resource download -> 410 RESOURCE_EXPIRED
```

This protects users immediately.

## Cleanup

Cleanup happens later.

It scans metadata and removes old bytes from storage.

```txt
scan resources
  -> find expired resources
  -> delete bytes from ObjectStorage
  -> mark metadata deleted
```

## Function

```txt
cleanupExpiredResources()
```

It returns counts:

```txt
scanned
expiredMarkedDeleted
bytesDeleted
```

These counts are useful for logs, metrics, and dashboards.

## Why Plain Function First

We did not start with cron.

We first made a testable unit:

```txt
input: resourceStore + objectStorage
output: cleanup result
```

Later, a scheduler can call this function every few minutes.

## Production Note

In production, cleanup should be safe to retry.

If bytes are already gone, cleanup should not fail the whole job.

That is why the job checks:

```txt
objectStorage.exists(resource.storageKey)
```

before deleting.
