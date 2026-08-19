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
import { db } from "@workspace/db";

// ─────────────────────────────────────────────────────────────────────────────
// Per-test DB state
// ─────────────────────────────────────────────────────────────────────────────

const selectQueue: unknown[][] = [];
const objectStorageMocks = vi.hoisted(() => ({
  getObjectEntityFile: vi.fn(),
  downloadObject: vi.fn(),
}));
const PNG_HEADER = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

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
      insert: vi.fn(() => ({
        values: vi.fn().mockResolvedValue([]),
      })),
    },
    productsTable: tableStub,
    productChaptersTable: tableStub,
    salesCopyTable: tableStub,
    previewTokensTable: tableStub,
    bioSettingsTable: tableStub,
    bioLinksTable: tableStub,
    bioAnalyticsEventsTable: tableStub,
    bioAvatarUploadsTable: tableStub,
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
    getObjectEntityFile = objectStorageMocks.getObjectEntityFile;
    downloadObject = objectStorageMocks.downloadObject;
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

const PUBLISHED_BIO_SETTINGS = {
  userId: "user-1",
  slug: "alice",
  displayName: "Alice",
  bio: "Writing practical guides",
  avatarUrl: "/objects/uploads/avatar-123",
  theme: "noir",
  published: true,
  showProducts: false,
  socialLinks: [],
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

describe("public bio analytics", () => {
  let app: express.Express;

  beforeEach(() => {
    selectQueue.length = 0;
    vi.clearAllMocks();
    app = buildApp();
  });

  it("records one anonymous page-view event after loading a published bio page", async () => {
    selectQueue.push(
      [
        {
          userId: "user-1",
          published: true,
          displayName: "Alice",
          bio: "",
          avatarUrl: null,
          theme: "noir",
          socialLinks: [],
          showProducts: false,
        },
      ],
      [],
    );

    const res = await request(app).get("/public/bio/alice");

    expect(res.status).toBe(200);
    expect(vi.mocked(db.insert)).toHaveBeenCalledOnce();
  });

  it("records a click only for an active link owned by the published bio page", async () => {
    selectQueue.push(
      [{ userId: "user-1", published: true }],
      [{ id: "11111111-1111-4111-8111-111111111111" }],
    );

    const res = await request(app).post(
      "/public/bio/alice/links/11111111-1111-4111-8111-111111111111/click",
    );

    expect(res.status).toBe(204);
    expect(vi.mocked(db.insert)).toHaveBeenCalledOnce();
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

describe("public bio avatars", () => {
  let app: express.Express;

  beforeEach(() => {
    selectQueue.length = 0;
    vi.clearAllMocks();
    app = buildApp();
  });

  it("returns a public avatar proxy URL for an uploaded avatar", async () => {
    selectQueue.push(
      [PUBLISHED_BIO_SETTINGS],
      [], // active links
      [{ id: "avatar-registration" }], // avatar ownership registration
    );

    const res = await request(app).get("/public/bio/alice");

    expect(res.status).toBe(200);
    expect(res.body.avatarUrl).toBe("/public/bio/alice/avatar");
  });

  it("keeps a previously pasted external avatar URL unchanged", async () => {
    selectQueue.push([
      { ...PUBLISHED_BIO_SETTINGS, avatarUrl: "https://example.com/alice.jpg" },
    ], []); // settings, active links

    const res = await request(app).get("/public/bio/alice");

    expect(res.status).toBe(200);
    expect(res.body.avatarUrl).toBe("https://example.com/alice.jpg");
  });

  it("serves an uploaded avatar from storage to anonymous visitors", async () => {
    selectQueue.push(
      [PUBLISHED_BIO_SETTINGS],
      [{ id: "avatar-registration" }], // avatar ownership registration
    );
    objectStorageMocks.getObjectEntityFile.mockResolvedValue({});
    objectStorageMocks.downloadObject.mockResolvedValue(
      new Response(PNG_HEADER, {
        headers: { "Content-Type": "image/jpeg" },
      }),
    );

    const res = await request(app).get("/public/bio/alice/avatar");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("image/png");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.body).toEqual(PNG_HEADER);
    expect(objectStorageMocks.getObjectEntityFile).toHaveBeenCalledWith(
      "/objects/uploads/avatar-123",
    );
  });

  it("does not expose an uploaded path without the creator's avatar registration", async () => {
    selectQueue.push(
      [PUBLISHED_BIO_SETTINGS],
      [], // no avatar registration for this bio owner
    );

    const res = await request(app).get("/public/bio/alice/avatar");

    expect(res.status).toBe(404);
    expect(objectStorageMocks.getObjectEntityFile).not.toHaveBeenCalled();
  });

  it("rejects a forged image MIME type instead of serving active content", async () => {
    selectQueue.push(
      [PUBLISHED_BIO_SETTINGS],
      [{ id: "avatar-registration" }],
    );
    objectStorageMocks.getObjectEntityFile.mockResolvedValue({});
    objectStorageMocks.downloadObject.mockResolvedValue(
      new Response("<script>window.pwned = true</script>", {
        headers: { "Content-Type": "image/png" },
      }),
    );

    const res = await request(app).get("/public/bio/alice/avatar");

    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toContain("application/json");
  });

  it("rejects an oversized object even when it claims to be an image", async () => {
    selectQueue.push(
      [PUBLISHED_BIO_SETTINGS],
      [{ id: "avatar-registration" }],
    );
    objectStorageMocks.getObjectEntityFile.mockResolvedValue({});
    objectStorageMocks.downloadObject.mockResolvedValue(
      new Response(PNG_HEADER, {
        headers: {
          "Content-Type": "image/png",
          "Content-Length": String(5 * 1024 * 1024 + 1),
        },
      }),
    );

    const res = await request(app).get("/public/bio/alice/avatar");

    expect(res.status).toBe(404);
  });
});
