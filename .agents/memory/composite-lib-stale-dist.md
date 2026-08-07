---
name: Composite TS lib stale dist after adding exports
description: Why a downstream package can typecheck against outdated types after editing a workspace lib
---
Libs like `lib/api-client-react` and `lib/object-storage-web` use `composite: true` with a checked-in/generated `dist` output. TypeScript project references resolve downstream imports against that `dist`, not the source.

**Why:** after adding a new export (function, type, hook) to a composite lib, downstream packages can still resolve the *old* `dist` output and either fail to find the new export or silently typecheck against stale types — with no error pointing at the real cause.

**How to apply:** after adding/changing exports in a composite lib, run `pnpm exec tsc -b --force` inside that lib's directory (or the affected project reference) before typechecking/using it downstream. Don't trust a clean downstream typecheck until you've done this. New composite libs (e.g. anything with `composite: true` in its tsconfig) need `declarationMap` + `emitDeclarationOnly` set correctly too, or you'll hit a `TS6306` project-reference error.
