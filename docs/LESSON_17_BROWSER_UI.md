# Lesson 17: Browser UI

Now the app has a real browser UI.

## Files

```txt
public/index.html
public/styles.css
public/app.js
```

The Express app serves this folder as static assets.

## Routes

```txt
/          -> create/open share UI
/s/:shareId -> same UI, preloaded with that share
```

## What The UI Can Do

```txt
create share
open share
upload file
list resources
preview resource
download resource
delete resource when share mode is edit
```

## Why Plain HTML First

We did not add React/Vite yet.

Reason:

```txt
backend concepts first
no frontend build step
easy to inspect in browser
```

Later we can replace this with React once the API shape is stable.

## Important Product Detail

The share URL is still the capability.

Anyone with:

```txt
/s/share_xxx
```

can interact according to that share's permissions.
