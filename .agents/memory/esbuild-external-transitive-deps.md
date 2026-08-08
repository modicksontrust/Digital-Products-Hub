---
name: esbuild-externalized packages need to be direct dependencies
description: Externalizing a package in esbuild build.mjs isn't enough if it's only a transitive dep
---

`artifacts/api-server/build.mjs` externalizes certain packages (e.g. `@google-cloud/*`, `@google/*`)
instead of bundling them, because they do native/dynamic requires that break when bundled (see
esbuild-bundling-pitfalls.md for the general pattern). Externalizing only tells esbuild not to inline
the code — Node still has to resolve the real package at runtime from `node_modules`.

**Why:** if the externalized package is only a dependency of some other workspace lib (e.g. a new
`@workspace/integrations-*` lib depends on `@google/genai`), pnpm's strict linking means it won't be
resolvable from the api-server's own `node_modules`, so the built `dist/index.mjs` throws
`ERR_MODULE_NOT_FOUND` for that package at container start — even though `tsc`/typecheck and the
esbuild step both succeed.

**How to apply:** whenever a new dependency is pulled in transitively through a workspace lib and is
also externalized in `build.mjs`, add it as a **direct** dependency of the consuming
app/service's own `package.json` too (matching its version), then `pnpm install`.
