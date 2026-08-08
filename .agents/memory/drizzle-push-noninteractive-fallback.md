---
name: drizzle-kit push fails non-interactively
description: When drizzle-kit push/push-force hangs on a TTY prompt, apply the DDL via raw SQL instead
---

In this environment, `pnpm --filter @workspace/db run push` (and `push-force`) can fail when
drizzle-kit's interactive rename/conflict resolver needs a TTY, even though the command is meant to
run non-interactively. Piping newlines/`yes` into it does not reliably help.

**Why:** drizzle-kit's schema-diff prompt (e.g. "is this a rename?") blocks on stdin regardless of
`--force` in some cases; the shell tool here has no real TTY.

**How to apply:** when adding a genuinely new table (no rename ambiguity), skip `drizzle-kit push`
and create the table directly with `CREATE TABLE IF NOT EXISTS ...` (via the `executeSql` database
callback) matching the Drizzle schema column-for-column. Keep the Drizzle schema as the source of
truth for the app's types; the raw SQL is just how the table gets created in this environment.
