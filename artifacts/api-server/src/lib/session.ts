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
