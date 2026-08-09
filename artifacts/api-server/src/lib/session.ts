import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import pg from "pg";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

const secret = process.env["SESSION_SECRET"];
if (!secret) {
  throw new Error("SESSION_SECRET environment variable is required");
}

const PgStore = connectPgSimple(session);

export async function ensureSessionTable(): Promise<void> {
  await sessionPool.query(`
    CREATE TABLE IF NOT EXISTS "session" (
      "sid" varchar NOT NULL COLLATE "default",
      "sess" json NOT NULL,
      "expire" timestamp(6) NOT NULL,
      CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
    );
    CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
  `);
}

export async function ensurePreviewTokensTable(): Promise<void> {
  await sessionPool.query(`
    CREATE TABLE IF NOT EXISTS preview_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      token TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT preview_tokens_token_unique UNIQUE (token)
    );
  `);
}

export const sessionPool = new pg.Pool({
  connectionString: process.env["DATABASE_URL"],
  max: 3,
});

export const sessionMiddleware = session({
  // Note: createTableIfMissing reads table.sql relative to the bundled file,
  // which breaks under esbuild bundling — the table is created by ensureSessionTable().
  store: new PgStore({ pool: sessionPool }),
  secret,
  resave: false,
  saveUninitialized: false,
  name: "digiproducts.sid",
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: false, // TLS terminates at the Replit proxy
    maxAge: 1000 * 60 * 60 * 24 * 14,
  },
});
