---
name: Public image validation
description: Safety rules for serving user-uploaded images through an application-owned public proxy.
---

An upload URL and its declared MIME type are not proof that the stored object is
an image. Before attaching a private upload to a public profile, and again before
serving it anonymously, read a bounded amount of the object and verify a small
allowlist of safe image signatures. Serve the verified bytes with a forced
allowlisted `Content-Type` and `X-Content-Type-Options: nosniff`; never forward
the object's own content type.

**Why:** A generic presigned PUT can accept mismatched bytes or MIME metadata.
Forwarding that metadata through an app-origin public route can turn an uploaded
HTML payload into same-origin active content.

**How to apply:** Use this rule for every new public proxy over user-controlled
App Storage objects, in addition to checking that the object is registered to
the requesting owner and intended public purpose.