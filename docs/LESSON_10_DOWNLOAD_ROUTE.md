# Lesson 10: Download Route

Now uploaded bytes can come back out.

## Route

```txt
GET /api/shares/:shareId/resources/:resourceId/download
```

## Flow

```txt
find share
  -> check download permission
  -> find resource
  -> confirm resource belongs to this share
  -> confirm bytes exist in ObjectStorage
  -> stream bytes to response
```

## Why Check Share And Resource Together

A resource id alone is not enough.

This must be blocked:

```txt
share A url + resource from share B
```

So the route checks:

```txt
resource.shareId === share.id
```

## Response Headers

The route sends:

```txt
Content-Type
Content-Length
Content-Disposition
```

`Content-Disposition` makes the browser download using the original file name.

## Production Note

The route streams from storage.

That is better than loading the full file into memory before sending it.
