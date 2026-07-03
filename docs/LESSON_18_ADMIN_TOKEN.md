# Lesson 18: Admin Token

Now share creation can be protected.

Guests still do not log in.

## Why

If this app is hosted publicly, anonymous share creation can be abused.

Someone could create unlimited upload links.

So we added an optional admin token for:

```txt
POST /api/shares
```

## What Stays Public

These are still link-based:

```txt
open share
list resources
upload
preview
download
delete when link mode is edit
```

The link is still the permission.

## Config

Set:

```bash
ADMIN_TOKEN=secret npm run dev
```

Then create-share requests must send:

```txt
x-admin-token: secret
```

## Local Learning Mode

If `ADMIN_TOKEN` is not set, share creation stays open.

That keeps local development simple.

## Production Note

This is not full authentication.

It is a simple first guardrail for the admin action.

Later, this can become:

```txt
admin login
team accounts
API keys
OAuth
```
