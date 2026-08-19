---
name: Public upload authorization
description: Rules for safely exposing an App Storage upload on an anonymous page.
---

Never make an object path public merely because an authenticated user submitted a syntactically valid path. Bind uploads intended for an anonymous surface to their uploader and intended use in persistent metadata, then enforce that binding both when the object is attached and when it is served.

**Why:** generic private upload paths can belong to other users or contain content intended to remain private. A public passthrough that trusts any such path creates an object-level authorization bypass.

**How to apply:** when adding a public proxy for an uploaded asset, create a purpose-specific upload registration, require a matching owner registration before saving its path, and recheck it in the anonymous route. Keep externally hosted URLs on their existing validation path.