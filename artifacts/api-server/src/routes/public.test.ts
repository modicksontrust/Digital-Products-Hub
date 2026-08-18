/**
 * Tests for the public sales page route GET /public/sales-page/:slug.
 *
 * Key confirmation: when a product has been deleted (no row in DB) the route
 * returns 404, so a buyer who bookmarked the URL sees a clean "not found"
 * state rather than a broken or ghost page.
 *
 * Strategy: mount the real public router inside a minimal Express app.
 * @workspace/db is mocked with a chainable query builder whose resolved value
 * is controlled per-test via a `selectQueue`.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

// ─────────────────────────────────────────────────────────────────────────────
// Per-test DB state
// ─────────────────────────────────────────────────────────────────────────────

const selectQueue: unknown[][] = [];

// ─────────────────────────────────────────────────────────────────────────────
// Chainable DB mock
// ─────────────────────────────────────────────────────────────────────────────

function makeChain(result: unknown[]) {
  const p = Promise.resolve(result);
  const chain: Record<string, unknown> = {};
  for (const m of ["from", "where", "innerJoin", "leftJoin", "orderBy", "limit", "and", "gt", "eq"]) {
    chain[m] = () => chain;
  }
  chain["then"] = (res: Parameters<Promise<unknown>["then"]>[0], rej: Parameters<Promise<unknown>["then"]>[1]) =>
    p.then(res, rej);
  chain["catch"] = (rej: Parameters<Promise<unknown>["catch"]>[0]) => p.catch(rej);
  chain["finally"] = (fin: Parameters<Promise<unknown>["finally"]>[0]) => p.finally(fin);
  return chain;
}

// ─────────────────────────────────────────────────────────────────────────────
// Module mocks — must be declared before importing the module under test
// ─────────────────────────────────────────────────────────────────────────────

vi.mock("@workspace/db", () => {
  const tableStub = {} as const;
  return {
    db: {
      select: vi.fn(() => makeChain(selectQueue.shift() ?? [])),
    },
    productsTable: tableStub,
    productChaptersTable: tableStub,
    salesCopyTable: tableStub,
    previewTokensTable: tableStub,
  };
});

vi.mock("@workspace/api-zod", async () => {
  const actual = await vi.importActual<typeof import("@workspace/api-zod")>(
    "@workspace/api-zod",
  );
  return {
    ...actual,
    GetPublicSalesPageResponse: { parse: (x: unknown) => x },
  };
});

vi.mock("../lib/objectStorage.js", () => ({
  ObjectStorageService: class {
    getObjectEntityFile = vi.fn();
    downloadObject = vi.fn();
  },
  ObjectNotFoundError: class ObjectNotFoundError extends Error {},
}));

// ─────────────────────────────────────────────────────────────────────────────
// App setup (imported after mocks are registered)
// ─────────────────────────────────────────────────────────────────────────────

import publicRouter from "./public.js";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(publicRouter);
  return app;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const PUBLISHED_PRODUCT = {
  id: "prod-1",
  slug: "my-ebook",
  title: "My eBook",
  subtitle: null,
  authorName: "Alice",
  published: true,
  priceCents: 1999,
  coverConfig: null,
  ownerId: "user-1",
};

const UNPUBLISHED_PRODUCT = {
  ...PUBLISHED_PRODUCT,
  published: false,
};

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /public/sales-page/:slug", () => {
  let app: express.Express;

  beforeEach(() => {
    selectQueue.length = 0;
    vi.clearAllMocks();
    app = buildApp();
  });

  // ── Deleted product ─────────────────────────────────────────────────────────

  it("returns 404 when the product has been deleted (no DB row)", async () => {
    // DB returns an empty array — the product row is gone (hard-deleted).
    selectQueue.push([]); // loadPublishedProductByslug → product query

    const res = await request(app).get("/public/sales-page/my-ebook");

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: "Not found" });
  });

  it("returns 404 for a slug that never existed", async () => {
    selectQueue.push([]); // no matching product

    const res = await request(app).get("/public/sales-page/ghost-page");

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: "Not found" });
  });

  // ── Unpublished product ─────────────────────────────────────────────────────

  it("returns 404 for an unpublished-but-slugged product (no preview token)", async () => {
    // The product exists but is not published → loadPublishedProductByslug
    // returns null, so the route returns 404.
    selectQueue.push([UNPUBLISHED_PRODUCT]); // product query returns unpublished row

    const res = await request(app).get("/public/sales-page/my-ebook");

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: "Not found" });
  });

  // ── Happy path ──────────────────────────────────────────────────────────────

  it("returns 200 with sales page data for a published product", async () => {
    selectQueue.push([PUBLISHED_PRODUCT]); // product query
    selectQueue.push([]); // chapters query
    selectQueue.push([]); // sales copy query

    const res = await request(app).get("/public/sales-page/my-ebook");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      productId: "prod-1",
      title: "My eBook",
    });
  });

  // ── Preview token path ──────────────────────────────────────────────────────

  it("returns 404 via preview token path when the product has been deleted", async () => {
    // loadProductBySlugWithToken: first select is the product lookup → empty
    selectQueue.push([]); // product not found

    const res = await request(app).get(
      "/public/sales-page/my-ebook?preview=sometoken",
    );

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: "Not found" });
  });

  it("returns 404 via preview token path when the token is invalid or expired", async () => {
    // loadProductBySlugWithToken: product found, but token lookup returns empty
    selectQueue.push([UNPUBLISHED_PRODUCT]); // product row found
    selectQueue.push([]); // token lookup → no valid token

    const res = await request(app).get(
      "/public/sales-page/my-ebook?preview=badtoken",
    );

    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ error: "Not found" });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Cover proxy route
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /public/sales-page/:slug/cover", () => {
  let app: express.Express;

  beforeEach(() => {
    selectQueue.length = 0;
    vi.clearAllMocks();
    app = buildApp();
  });

  it("returns 404 when the product has been deleted (no DB row)", async () => {
    // The product row is gone — loadPublishedProductByslug returns null.
    selectQueue.push([]); // product query → empty (hard-deleted)

    const res = await request(app).get("/public/sales-page/my-ebook/cover");

    expect(res.status).toBe(404);
  });
});
