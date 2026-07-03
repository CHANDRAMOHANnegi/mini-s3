# Lesson 15: Cleanup Scheduler

Now cleanup can run automatically.

## Previous Step

We built a plain function:

```txt
cleanupExpiredResources()
```

That function knows how to clean.

## This Step

We added a scheduler:

```txt
startResourceCleanupScheduler()
```

That scheduler knows when to clean.

## Why Separate Them

Separate logic is easier to test.

```txt
cleanup function  -> business logic
scheduler         -> timer/runner
```

Later, the scheduler can become:

```txt
cron
queue worker
Kubernetes CronJob
serverless scheduled function
```

without rewriting cleanup behavior.

## Server Wiring

The server creates shared dependencies:

```txt
shareStore
resourceStore
objectStorage
```

Then both the API and cleanup scheduler use the same stores.

```txt
createApp({ shareStore, resourceStore, objectStorage })
startResourceCleanupScheduler({ resourceStore, objectStorage })
```

## Config

Cleanup interval can be configured with:

```txt
CLEANUP_INTERVAL_MS
```

Default:

```txt
5 minutes
```

## Production Note

In a multi-server deployment, do not let every API server run cleanup blindly.

Better options:

```txt
one dedicated worker
distributed lock
database advisory lock
managed scheduled job
```
