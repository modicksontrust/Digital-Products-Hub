export * from "./generated/api";
// Note: "./generated/types" (plain TS interfaces mirroring each zod schema) is
// intentionally NOT re-exported here. Every schema name collides between the
// zod const in ./generated/api and the interface in ./generated/types, which
// is a TS2308 ambiguous-export error the moment both are star-exported.
// Nothing in this monorepo imports the plain interfaces (zod schema values +
// z.infer are used throughout), so we only export the zod barrel.
export * from "./manual";
export * from './generated/types';
