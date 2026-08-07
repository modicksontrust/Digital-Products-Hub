---
name: Orval/zod v4 codegen fix
description: Why the api-spec codegen script rewrites zod imports
---
Orval 8 emits zod v4 syntax (`zod.int()`), but the workspace pins zod 3.25.x where that only exists under the `zod/v4` entrypoint.

**Why:** typecheck fails on generated `lib/api-zod/src/generated/api.ts` otherwise.

**How to apply:** the codegen script in `lib/api-spec/package.json` has a sed step rewriting `from 'zod'` → `from 'zod/v4'` in the generated file. Never remove it; re-add it if codegen config is regenerated.
