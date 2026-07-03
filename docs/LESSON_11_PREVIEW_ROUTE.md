# Lesson 11: Preview Route

Now resources can open inline in the browser.

## Route

```txt
GET /api/shares/:shareId/resources/:resourceId/preview
```

## Preview vs Download

Download says:

```txt
Content-Disposition: attachment
```

Preview says:

```txt
Content-Disposition: inline
```

That small header changes browser behavior.

## Flow

```txt
find share
  -> check preview permission
  -> find resource
  -> confirm resource belongs to this share
  -> reject unsupported binary previews
  -> confirm bytes exist
  -> stream bytes inline
```

## Supported Preview Types

These can be previewed:

```txt
image
video
audio
pdf
text
html
```

Binary files should still be downloaded.

## HTML Safety

HTML preview is risky because HTML can run scripts.

For now, the route adds:

```txt
Content-Security-Policy: sandbox
```

This is a safety guard for learning mode.

Production should isolate HTML preview even more, usually on a separate preview domain.
