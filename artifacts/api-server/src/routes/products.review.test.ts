/**
 * Tests for the self-review protection on POST /products/:productId/review.
 *
 * Strategy: mount the real products router inside a minimal Express app.
 * - Auth middlewares are replaced by a simple injector that puts a
 *   pre-built `req.user` onto the request; no real DB session is needed.
 * - @workspace/db is mocked with a chainable query builder whose resolved
 *   value is controlled per-test via the `selectQueue` / `updateQueue` queues.
 * - Response schema `parse` calls are made identity functions so the test
 *   does not need to produce a fully-shaped product object.
 * - Side-effect helpers (audit, notify) are stubbed out.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import express, { type Request, type Response, type NextFunction } from "express";
import request from "supertest";
import type { User } from "@workspace/db";

// ─────────────────────────────────────────────────────────────────────────────
// Mutable per-test state
// ─────────────────────────────────────────────────────────────────────────────

let currentUser: User;

// Queues that feed the chainable DB mock; each select/update call pops one entry.
const selectQueue: unknown[][] = [];
const updateQueue: unknown[][] = [];

// ─────────────────────────────────────────────────────────────────────────────
// Chainable DB mock helper
// ─────────────────────────────────────────────────────────────────────────────

/** Returns a Drizzle-like chainable object that resolves to `result` when awaited. */
function makeChain(result: unknown[]) {
  const p = Promise.resolve(result);
  const chain: Record<string, unknown> = {};
  for (const m of [
    "from", "where", "innerJoin", "leftJoin", "orderBy",
    "limit", "values", "set", "returning",
  ]) {
    chain[m] = () => chain;
  }
  chain["then"]    = (res: Parameters<Promise<unknown>["then"]>[0], rej: Parameters<Promise<unknown>["then"]>[1]) => p.then(res, rej);
  chain["catch"]   = (rej: Parameters<Promise<unknown>["catch"]>[0]) => p.catch(rej);
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
      insert: vi.fn(() => makeChain([])),
      update: vi.fn(() => makeChain(updateQueue.shift() ?? [])),
    },
    productsTable:        tableStub,
    productChaptersTable: tableStub,
    usersTable:           tableStub,
    reviewsTable:         tableStub,
    commentsTable:        tableStub,
    salesCopyTable:       tableStub,
    previewTokensTable:   tableStub,
  };
});

// Make all response schema `parse` calls identity functions so partial mock
// objects don't trigger Zod validation errors in the handler.
vi.mock("@workspace/api-zod", async () => {
  const actual = await vi.importActual<typeof import("@workspace/api-zod")>(
    "@workspace/api-zod",
  );
  const identity = { parse: (x: unknown) => x };
  return {
    ...actual,
    // Override only the schemas used by the review endpoint and its helpers
    ReviewProductResponse:    identity,
    GetProductsResponse:      identity,
    CreateProductResponse:    identity,
    ImportManuscriptResponse: identity,
    GetProductResponse:       identity,
    UpdateProductResponse:    identity,
    DuplicateProductResponse: identity,
    ArchiveProductResponse:   identity,
    PublishProductResponse:   identity,
    UnpublishProductResponse: identity,
    SubmitForReviewResponse:  identity,
    GetReviewQueueResponse:   identity,
    AddChapterResponse:       identity,
    UpdateChapterResponse:    identity,
    DeleteChapterResponse:    identity,
    ReorderChaptersResponse:  identity,
    GetCommentsResponse:      identity,
    AddCommentResponse:       identity,
    GetSalesCopyResponse:     identity,
    UpdateSalesCopyResponse:  identity,
    GeneratePreviewTokenResponse: identity,
  };
});

vi.mock("../lib/helpers.js", () => ({
  audit:   vi.fn().mockResolvedValue(undefined),
  notify:  vi.fn().mockResolvedValue(undefined),
  iso:     (d: Date | null | undefined) => d?.toISOString() ?? null,
}));

vi.mock("../lib/serialize.js", () => ({
  serializeProduct: vi.fn(async (product: Record<string, unknown>) => ({
    id:        product["id"],
    ownerId:   product["ownerId"],
    ownerName: "Mock Owner",
    type:      product["type"]   ?? "ebook",
    title:     product["title"]  ?? "Test Product",
    status:    product["status"] ?? "draft",
  })),
  serializeChapter: vi.fn((ch: Record<string, unknown>) => ch),
}));

vi.mock("../lib/objectStorage.js", () => ({
  ObjectStorageService: class {
    getObjectEntityFile = vi.fn();
  },
}));

vi.mock("../lib/manuscript.js", () => ({
  extractManuscriptText: vi.fn(),
  splitIntoChapters:     vi.fn(),
}));

// Replace auth middlewares — inject currentUser directly, run real permission logic.
vi.mock("../middlewares/auth.js", async () => {
  const { hasPermission } =
    await vi.importActual<typeof import("../lib/permissions.js")>(
      "../lib/permissions.js",
    );
  return {
    requireAuth: (req: Request, _res: Response, next: NextFunction) => {
      (req as Request & { user: User }).user = currentUser;
      next();
    },
    requireOnboarding: (_req: Request, _res: Response, next: NextFunction) =>
      next(),
    requirePermission:
      (key: string) =>
      (req: Request, res: Response, next: NextFunction) => {
        const user = (req as Request & { user?: User }).user;
        if (
          !user ||
          !hasPermission(
            user.role,
            key as Parameters<typeof hasPermission>[1],
          )
        ) {
          res.status(403).json({ error: "Not permitted" });
          return;
        }
        next();
      },
  };
});

// ─────────────────────────────────────────────────────────────────────────────
// Import the router after all mocks are in place
// ─────────────────────────────────────────────────────────────────────────────

const { default: productsRouter } = await import("./products.js");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(productsRouter);
  return app;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const OWNER_ID    = "owner-user-id";
const REVIEWER_ID = "reviewer-user-id";

/**
 * The product owner also has `manager` role so they hold `canReview`.
 * This is the realistic scenario where an admin/manager created a product
 * and then tries to self-review it — the guard must still fire.
 */
const ownerUser = {
  id:                 OWNER_ID,
  fullName:           "Alice Manager",
  email:              "alice@example.com",
  role:               "manager",   // has canReview
  status:             "active",
  onboardingComplete: true,
  onboardingExempt:   false,
} as unknown as User;

/** A different reviewer who also has the `canReview` permission. */
const reviewerUser = {
  id:                 REVIEWER_ID,
  fullName:           "Bob Manager",
  email:              "bob@example.com",
  role:               "manager",
  status:             "active",
  onboardingComplete: true,
  onboardingExempt:   false,
} as unknown as User;

const productInReview = {
  id:        "product-abc",
  ownerId:   OWNER_ID,
  type:      "ebook",
  title:     "My Great Book",
  status:    "in_review",
  published: false,
  slug:      null,
} as unknown as import("@workspace/db").Product;

const approveBody           = { decision: "approved",           comment: "Looks great!" };
const changesRequestedBody  = { decision: "changes_requested",  comment: "Fix this." };

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /products/:productId/review — self-review protection", () => {
  beforeEach(() => {
    selectQueue.length = 0;
    updateQueue.length = 0;
    vi.clearAllMocks();
  });

  // ── Self-review blocked ─────────────────────────────────────────────────────

  it("returns 403 when the product owner tries to approve their own product", async () => {
    currentUser = ownerUser;
    // loadAccessible: owner's id matches, product is returned
    selectQueue.push([productInReview]);

    const res = await request(buildApp())
      .post(`/products/${productInReview.id}/review`)
      .send(approveBody);

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: "You cannot review your own product" });
  });

  it("returns 403 when the owner requests changes on their own product", async () => {
    currentUser = ownerUser;
    selectQueue.push([productInReview]);

    const res = await request(buildApp())
      .post(`/products/${productInReview.id}/review`)
      .send(changesRequestedBody);

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ error: "You cannot review your own product" });
  });

  it("does NOT insert a review row when self-review is blocked", async () => {
    currentUser = ownerUser;
    selectQueue.push([productInReview]);

    const { db } = await import("@workspace/db");
    await request(buildApp())
      .post(`/products/${productInReview.id}/review`)
      .send(approveBody);

    expect(vi.mocked(db.insert)).not.toHaveBeenCalled();
  });

  it("does NOT update the product status when self-review is blocked", async () => {
    currentUser = ownerUser;
    selectQueue.push([productInReview]);

    const { db } = await import("@workspace/db");
    await request(buildApp())
      .post(`/products/${productInReview.id}/review`)
      .send(approveBody);

    expect(vi.mocked(db.update)).not.toHaveBeenCalled();
  });

  // ── Successful review by a different user ───────────────────────────────────

  it("returns 200 when a different user with canReview permission approves", async () => {
    currentUser = reviewerUser;
    // loadAccessible: manager has canViewAllProducts, product is returned
    selectQueue.push([productInReview]);
    // ownerName() — second select inside the handler
    selectQueue.push([{ fullName: "Alice Manager" }]);
    // db.update().set().where().returning() → approved product
    updateQueue.push([{ ...productInReview, status: "approved" }]);

    const res = await request(buildApp())
      .post(`/products/${productInReview.id}/review`)
      .send(approveBody);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "approved" });
  });

  it("returns 200 when a different user with canReview permission requests changes", async () => {
    currentUser = reviewerUser;
    selectQueue.push([productInReview]);
    selectQueue.push([{ fullName: "Alice Manager" }]);
    updateQueue.push([{ ...productInReview, status: "changes_requested" }]);

    const res = await request(buildApp())
      .post(`/products/${productInReview.id}/review`)
      .send(changesRequestedBody);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: "changes_requested" });
  });

  it("inserts a review row when a different reviewer submits a decision", async () => {
    currentUser = reviewerUser;
    selectQueue.push([productInReview]);
    selectQueue.push([{ fullName: "Alice Manager" }]);
    updateQueue.push([{ ...productInReview, status: "approved" }]);

    const { db } = await import("@workspace/db");
    await request(buildApp())
      .post(`/products/${productInReview.id}/review`)
      .send(approveBody);

    expect(vi.mocked(db.insert)).toHaveBeenCalledOnce();
  });

  // ── Edge cases ──────────────────────────────────────────────────────────────

  it("returns 403 (not permitted) when a creator lacking canReview tries to review", async () => {
    currentUser = {
      ...ownerUser,
      id:   "third-user-id",
      role: "creator",   // no canReview
    } as unknown as User;

    // Permission guard fires before any DB call
    const res = await request(buildApp())
      .post(`/products/${productInReview.id}/review`)
      .send(approveBody);

    expect(res.status).toBe(403);
  });

  it("returns 404 when the product does not exist", async () => {
    currentUser = reviewerUser;
    selectQueue.push([]); // loadAccessible returns nothing

    const res = await request(buildApp())
      .post(`/products/nonexistent-id/review`)
      .send(approveBody);

    expect(res.status).toBe(404);
  });

  it("returns 400 when the review body has an invalid decision value", async () => {
    currentUser = reviewerUser;

    const res = await request(buildApp())
      .post(`/products/${productInReview.id}/review`)
      .send({ decision: "maybe" });

    expect(res.status).toBe(400);
  });
});
