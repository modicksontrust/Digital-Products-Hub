---
name: esbuild bundling pitfalls (api-server)
description: Packages that break when bundled into the api-server dist
---
The api-server is bundled with esbuild; packages that read sibling data files at runtime break because those files aren't in `dist/`.

Known cases:
- **pdfkit/fontkit** — needs `.afm` font data and `@swc/helpers` requires; keep `pdfkit` and `fontkit` in the `external` list in `build.mjs` (and `@swc/helpers` installed).
- **connect-pg-simple `createTableIfMissing`** — reads `table.sql` relative to the bundle, fails with ENOENT and sessions silently never persist (login "succeeds" but every next request is 401). Create the `session` table explicitly at boot instead.

**How to apply:** when adding a dependency that ships data files or dynamic requires, add it to `external` in `artifacts/api-server/build.mjs` rather than debugging runtime ENOENTs.
