import app from "./app";
import { logger } from "./lib/logger";
import { seed } from "./seed";
import { ensureSessionTable, ensurePreviewTokensTable } from "./lib/session";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function main() {
  // Ensure required tables exist before accepting any traffic.
  await ensureSessionTable();
  await ensurePreviewTokensTable();

  // Seed is best-effort and must not block startup.
  seed().catch((err) => {
    logger.error({ err }, "Seed failed");
  });

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }

    logger.info({ port }, "Server listening");
  });
}

main().catch((err) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
