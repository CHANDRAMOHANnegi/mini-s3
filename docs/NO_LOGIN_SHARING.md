# No-Login Sharing Model

The product should work like Codeshare or public document links.

Guests should not be blocked by signup or login. If someone has a valid share URL, they can immediately use the resources allowed by that URL.

## Core Rule

```txt
The link is the permission.
```

This is called a capability-link model.

## Roles

Owner/admin:

- Creates share links.
- Chooses permission mode.
- Sets expiry and file limits.
- Revokes links.
- Reviews usage/audit logs.

Guest:

- Opens the share link.
- Uses the link immediately.
- Does not need an account.
- Can only perform actions allowed by that link.

## Link Modes

```txt
readonly
  list resources
  download resources

upload
  list resources
  download resources
  upload new resources

edit
  list resources
  download resources
  upload resources
  delete resources
```

## Production Guardrails

No guest login does not mean no security. Production should protect the system with:

- Unguessable share IDs or separate unguessable tokens.
- Expiry.
- Revocation.
- Per-share quota.
- Max file size.
- Rate limits.
- File type rules.
- Malware scanning.
- Audit logs.

## Recommended Production Shape

Use login only for admins, not guests.

```txt
Admin dashboard
  -> authenticated
  -> create/revoke/manage links

Guest share page
  -> no login
  -> permission comes from URL token
```

For a stronger version, split the visible share ID from the secret token:

```txt
/s/:shareId?token=:secretToken
```

Store only a hash of `secretToken` in the database. That lets the app revoke or rotate tokens without turning the share ID itself into the only secret.
