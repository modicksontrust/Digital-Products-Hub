---
name: orval api-zod barrel export collision
description: Why lib/api-zod/src/index.ts must not re-export generated/types, and what breaks if it does
---

`lib/api-zod`'s orval config emits two parallel sets of files for every OpenAPI schema: zod-schema
consts under `generated/api.ts` and plain TS `interface`s under `generated/types/*.ts`. The barrel
`lib/api-zod/src/index.ts` must only do `export * from "./generated/api"` — never also
`export * from "./generated/types"`.

**Why:** whenever a schema's orval-derived export name collides with the operationId-derived name
of a request/response body schema (which happens by coincidence, not by design — e.g. a component
named `FooBody` matching the auto-generated name for an operation's body), TS raises an ambiguous
export (TS2308) because the same identifier is a `const` in one barrel and an `interface` in the
other. This is latent for the *entire* schema set (~100+ exports) but only surfaces once both
barrels are re-exported together, and can be masked for a while by a stale `dist/`/`tsconfig.tsbuildinfo`
in this composite lib (see composite-lib-stale-dist.md) — a build that "used to pass" is not proof
the barrel is safe.

**How to apply:** if you need the plain TS interfaces app-wide, import them directly from
`@workspace/api-zod/generated/types/<name>` rather than re-exporting the whole directory from the
package root. Before adding any new re-export to this barrel, run `pnpm -w run typecheck:libs`
and, if stale-dist is suspected, `tsc -b --force` first.
