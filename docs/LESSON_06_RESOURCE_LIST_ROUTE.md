# Lesson 06: Resource List Route

Now we added the next relationship:

```txt
Share has many Resources
```

## New Store

```txt
src/stores/resourceStore.ts
```

For now it is an in-memory store, just like the share store.

It supports:

```txt
create(resource)
findById(id)
listByShareId(shareId)
```

## New Route

```http
GET /api/shares/:shareId/resources
```

This returns resources inside one share.

## Why This Route Comes Before Upload

Upload is two things:

```txt
1. Store file bytes
2. Create resource metadata
```

Before we handle file bytes, we should prove the metadata relationship works.

So this route teaches:

```txt
find share
if share missing -> 404
list resources for share
return share + resources
```

## Frontend Mental Model

It is like:

```js
const resourcesForShare = resources.filter(
  (resource) => resource.shareId === share.id
);
```

The API route is the backend version of that idea.

## Current Limitation

There is no public upload route yet.

The tests create a resource directly in the memory store, then call the API route to verify the list behavior.

Next step will be actual resource creation through an API route.
