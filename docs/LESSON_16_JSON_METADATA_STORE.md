# Lesson 16: JSON Metadata Store

Now metadata can survive a server restart.

## Problem

Before this step:

```txt
uploaded bytes -> local disk
share/resource metadata -> memory
```

That means file bytes existed after restart, but the server forgot the share links and resource ids.

## This Step

We added JSON-file stores:

```txt
createJsonFileShareStore()
createJsonFileResourceStore()
```

Server metadata now lives in:

```txt
storage/meta/shares.json
storage/meta/resources.json
```

## Why Keep The Same Store Interface

The app still talks to:

```txt
ShareStore
ResourceStore
```

It does not care whether the implementation is:

```txt
memory
JSON file
Postgres later
```

This is the same idea as `ObjectStorage`.

## Atomic Write

The JSON helper writes through a temp file and then renames it.

```txt
write temp file
rename temp -> real file
```

This reduces the chance of leaving a half-written JSON file.

## Current Limitation

JSON files are okay for local learning and a single server.

They are not enough for production with multiple servers.

Production metadata should move to:

```txt
Postgres
```

Why?

Because Postgres gives us stronger concurrency, indexes, constraints, and safer multi-process writes.
