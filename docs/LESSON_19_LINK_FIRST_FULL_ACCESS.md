# Lesson 19: Link-First Full Access

We simplified the product model.

## New Rule

There is one clean link:

```txt
/s/share_xxx
```

Anyone with that link can:

```txt
upload
list
preview
download
delete
```

## Why

Without login, the server cannot know who is the owner and who is a guest.

So this is not a user-permission product.

It is a temporary link-sharing product.

## Why Delete Is Acceptable Here

Resources are temporary.

Default expiry is:

```txt
24 hours
```

So the risk of delete is lower than a permanent storage system.

## Safety Model

Safety comes from:

```txt
unguessable share ids
short expiry
max file size
cleanup job
optional admin token for creating links
```

## UI Change

There is no separate create-share form now.

Opening the app gives a clean link.

Opening a new `/s/share_xxx` link can create that share automatically.
