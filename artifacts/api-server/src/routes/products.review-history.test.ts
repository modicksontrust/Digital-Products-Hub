/**
 * API-level tests: review history accuracy across multiple review cycles.
 *
 * Two describe blocks:
 *   1. Simple GET assertions with a pre-populated review store.
 *   2. Stateful workflow: submit → review → resubmit → review, then verify
 *      that both decisions accumulate in the right order.
 *
 * The DB layer is mocked so no real database is needed.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

// ── IDs ───────────────────────────────────────────────────────────────────────
const PRODUCT_ID = "aaaa-1111-bbbb-2222";
const OWNER_ID   = "user-owner-0001";
const REVIEWER_ID = "user-reviewer-0001";

// ── Timestamps (older → newer) ────────────────────────────────────────────────
const T1 = new Date("2026-07-01T10:00:00Z");
const T2 = new Date("2026-07-15T14:00:00Z");

// ── Full user objects matching the DB User type ───────────────────────────────
const NOW = new Date("2026-01-01T00:00:00Z");

const ownerUser = {
  id: OWNER_ID,
  email: "owner@test.com",
  fullName: "Owner Person",
  passwordHash: "hashed",
  role: "creator",
  status: "active",
  onboardingComplete: true,
  onboardingExempt: false,
  creditsBalance: 10,
  lastLoginAt: null as Date | null,
  createdAt: NOW,
  updatedAt: NOW,
};

const reviewerUser = {
  id: REVIEWER_ID,
  email: "reviewer@test.com",
  fullName: "Reviewer Admin",
  passwordHash: "hashed",
  role: "admin",
  status: "active",
  onboardingComplete: true,
  onboardingExempt: false,
  creditsBalance: 0,
  lastLoginAt: null as Date | null,
  createdAt: NOW,
  updatedAt: NOW,
};

// ── Minimal product skeleton ──────────────────────────────────────────────────
const BASE_PRODUCT = {
  id: PRODUCT_ID,
  ownerId: OWNER_ID,
  type: "ebook" as const,
  leadMagnetFormat: null,
  title: "Test eBook",
  subtitle: null,
  authorName: null,
  topic: "Testing",
  audience: null,
  tone: null,
  language: "English",
  depth: "standard",
  region: null,
  lengthTier: null,
  keyPoints: null,
  ctaText: null,
  coverConfig: null,
  priceCents: null,
  published: false,
  slug: null,
  requestedChapterCount: 1,
  createdAt: NOW,
  updatedAt: NOW,
};

// ── Shared mutable state ──────────────────────────────────────────────────────
// These are module-level `let`s so the vi.mock factories below can close over
// them and observe changes made in beforeEach / test bodies.

type ReviewRow = {
  review: {
    id: string;
    productId: string;
    reviewerId: string;
    decision: string;
    comment: string | null;
    createdAt: Date;
  };
  reviewerName: string | null;
};

const _reviewStore: ReviewRow[] = [];
let _productStatus = "approved";
let _currentUser = ownerUser as typeof ownerUser | typeof reviewerUser;

// ── DB mock ───────────────────────────────────────────────────────────────────
// We use sentinel objects as table references, then dispatch on `._t` inside
// the mock so each query resolves to the right data without call-order bookkeeping.

vi.mock("@workspace/db", () => {
  // Table sentinels
  const PT = { _t: "products" };   // productsTable
  const CT = { _t: "chapters" };   // productChaptersTable
  const UT = { _t: "users" };      // usersTable
  const RT = { _t: "reviews" };    // reviewsTable

  function resolveForTable(t: { _t: string } | null) {
    switch (t?._t) {
      case "products":
        return Promise.resolve([{ ...BASE_PRODUCT, status: _productStatus }]);
      case "chapters":
        return Promise.resolve([]);
      case "users":
        return Promise.resolve([{ fullName: _currentUser.fullName }]);
      case "reviews":
        // Reverse so newest is first, matching orderBy(desc(createdAt))
        return Promise.resolve([..._reviewStore].reverse());
      default:
        return Promise.resolve([]);
    }
  }

  function makeChain() {
    let _from: { _t: string } | null = null;

    const chain: Record<string, unknown> = {
      // Thenable: allows `await db.select()...where(...)` without .orderBy()
      then(
        onFulfilled?: ((v: unknown) => unknown) | null,
        onRejected?: ((e: unknown) => unknown) | null,
      ) {
        return resolveForTable(_from).then(
          onFulfilled ?? undefined,
          onRejected ?? undefined,
        );
      },
      from(t: { _t: string }) {
        _from = t;
        return chain;
      },
      leftJoin: () => chain,
      innerJoin: () => chain,
      where: () => chain,
      orderBy() {
        return resolveForTable(_from);
      },
    };
    return chain;
  }

  let _reviewSeq = 0;

  const db = {
    select: vi.fn(() => makeChain()),

    insert: vi.fn((table: { _t: string }) => ({
      values: (row: {
        productId: string;
        reviewerId: string;
        decision: string;
        comment?: string | null;
      }) => {
        if (table._t === "reviews") {
          _reviewSeq += 1;
          _reviewStore.push({
            review: {
              id: `rev-${_reviewSeq}`,
              productId: row.productId,
              reviewerId: row.reviewerId,
              decision: row.decision,
              comment: row.comment ?? null,
              // Spread seq ms apart so newest-first ordering is deterministic
              createdAt: new Date(NOW.getTime() + _reviewSeq * 60_000),
            },
            reviewerName: _currentUser.fullName,
          });
        }
        return { returning: () => Promise.resolve([]) };
      },
    })),

    update: vi.fn((_table: unknown) => ({
      set: (data: Record<string, unknown>) => ({
        where: () => ({
          returning: () => {
            if (typeof data["status"] === "string") {
              _productStatus = data["status"];
            }
            return Promise.resolve([
              { ...BASE_PRODUCT, status: _productStatus },
            ]);
          },
        }),
      }),
    })),
  };

  return {
    db,
    productsTable: PT,
    productChaptersTable: CT,
    usersTable: UT,
    reviewsTable: RT,
    commentsTable: {},
    salesCopyTable: {},
    previewTokensTable: {},
  };
});

// drizzle-orm operators just need to be callable
vi.mock("drizzle-orm", () => ({
  eq: vi.fn(() => ({})),
  and: vi.fn(() => ({})),
  asc: vi.fn(() => ({})),
  desc: vi.fn(() => ({})),
  or: vi.fn(() => ({})),
  ilike: vi.fn(() => ({})),
}));

// ── Auth middleware mock ──────────────────────────────────────────────────────
vi.mock("../middlewares/auth.js", () => ({
  requireAuth: (
    req: express.Request & { user?: unknown },
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    req.user = _currentUser;
    next();
  },
  requireOnboarding: (
    _req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => next(),
  requirePermission: () => (
    _req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => next(),
}));

vi.mock("../lib/helpers.js", () => ({
  audit: vi.fn(() => Promise.resolve()),
  notify: vi.fn(() => Promise.resolve()),
  iso: (d: Date | null) => (d ? d.toISOString() : null),
}));

vi.mock("../lib/permissions.js", () => ({
  hasPermission: (role: string, perm: string) => {
    if (perm === "canViewAllProducts" || perm === "canReview") {
      return role === "admin" || role === "manager";
    }
    return false;
  },
}));

vi.mock("../lib/objectStorage.js", () => ({
  ObjectStorageService: class {
    getObjectEntityFile = vi.fn();
  },
}));

// ── App factory ───────────────────────────────────────────────────────────────
async function buildApp() {
  const { default: productsRouter } = await import("./products.js");
  const app = express();
  app.use(express.json());
  app.use("/api", productsRouter);
  app.use(
    (
      err: Error,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      res.status(500).json({ error: err.message });
    },
  );
  return app;
}

// ─────────────────────────────────────────────────────────────────────────────
// Block 1 — simple GET assertions with a pre-populated review store
// ─────────────────────────────────────────────────────────────────────────────
describe("GET /api/products/:productId – review history shape (pre-populated store)", () => {
  let app: express.Express;

  beforeEach(async () => {
    // Seed two reviews (oldest first in store; resolveForTable reverses → newest first)
    _reviewStore.length = 0;
    _reviewStore.push(
      {
        review: {
          id: "rev-0001",
          productId: PRODUCT_ID,
          reviewerId: REVIEWER_ID,
          decision: "changes_requested",
          comment: "Please add more examples.",
          createdAt: T1,
        },
        reviewerName: "Reviewer One",
      },
      {
        review: {
          id: "rev-0002",
          productId: PRODUCT_ID,
          reviewerId: REVIEWER_ID,
          decision: "approved",
          comment: "Looks great now!",
          createdAt: T2,
        },
        reviewerName: "Reviewer Two",
      },
    );
    _productStatus = "approved";
    _currentUser = ownerUser;
    vi.clearAllMocks();
    app = await buildApp();
  });

  it("returns reviewHistory with both reviews present", async () => {
    const res = await request(app).get(`/api/products/${PRODUCT_ID}`);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const { reviewHistory } = res.body as { reviewHistory: unknown[] };
    expect(Array.isArray(reviewHistory)).toBe(true);
    expect(reviewHistory).toHaveLength(2);
  });

  it("returns reviewHistory in reverse-chronological order (newest first)", async () => {
    const res = await request(app).get(`/api/products/${PRODUCT_ID}`);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const { reviewHistory } = res.body as {
      reviewHistory: Array<{ createdAt: string; decision: string }>;
    };
    expect(reviewHistory[0].decision).toBe("approved");
    expect(reviewHistory[0].createdAt).toBe(T2.toISOString());
    expect(reviewHistory[1].decision).toBe("changes_requested");
    expect(reviewHistory[1].createdAt).toBe(T1.toISOString());
    expect(new Date(reviewHistory[0].createdAt).getTime()).toBeGreaterThan(
      new Date(reviewHistory[1].createdAt).getTime(),
    );
  });

  it("latestReview matches reviewHistory[0]", async () => {
    const res = await request(app).get(`/api/products/${PRODUCT_ID}`);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const { latestReview, reviewHistory } = res.body as {
      latestReview: Record<string, unknown>;
      reviewHistory: Array<Record<string, unknown>>;
    };
    expect(latestReview).toBeDefined();
    expect(reviewHistory.length).toBeGreaterThan(0);
    expect(latestReview).toEqual(reviewHistory[0]);
  });

  it("each review entry contains the required fields", async () => {
    const res = await request(app).get(`/api/products/${PRODUCT_ID}`);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const { reviewHistory } = res.body as {
      reviewHistory: Array<Record<string, unknown>>;
    };
    for (const entry of reviewHistory) {
      expect(entry).toHaveProperty("id");
      expect(entry).toHaveProperty("productId", PRODUCT_ID);
      expect(entry).toHaveProperty("decision");
      expect(entry).toHaveProperty("createdAt");
      expect(Object.keys(entry)).toContain("reviewerName");
    }
  });

  it("review comments are preserved across cycles", async () => {
    const res = await request(app).get(`/api/products/${PRODUCT_ID}`);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const { reviewHistory } = res.body as {
      reviewHistory: Array<{ comment: string | null }>;
    };
    expect(reviewHistory[0].comment).toBe("Looks great now!");
    expect(reviewHistory[1].comment).toBe("Please add more examples.");
  });

  it("reviewer names are preserved for each decision", async () => {
    const res = await request(app).get(`/api/products/${PRODUCT_ID}`);
    expect(res.status, JSON.stringify(res.body)).toBe(200);
    const { reviewHistory } = res.body as {
      reviewHistory: Array<{ reviewerName: string | null }>;
    };
    expect(reviewHistory[0].reviewerName).toBe("Reviewer Two");
    expect(reviewHistory[1].reviewerName).toBe("Reviewer One");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Block 2 — stateful workflow: submit → review → resubmit → review
// ─────────────────────────────────────────────────────────────────────────────
describe("review history – multi-cycle workflow (stateful mock)", () => {
  let app: express.Express;

  beforeEach(async () => {
    _reviewStore.length = 0;
    _productStatus = "ready";
    _currentUser = ownerUser;
    vi.clearAllMocks();
    app = await buildApp();
  });

  it("accumulates both decisions in reverse-chronological order after two full cycles", async () => {
    // ── Cycle 1 ───────────────────────────────────────────────────────────────
    // Owner submits product for review
    _currentUser = ownerUser;
    const sub1 = await request(app)
      .post(`/api/products/${PRODUCT_ID}/submit-review`);
    expect(sub1.status, JSON.stringify(sub1.body)).toBe(200);

    // Reviewer requests changes
    _currentUser = reviewerUser;
    const rev1 = await request(app)
      .post(`/api/products/${PRODUCT_ID}/review`)
      .send({ decision: "changes_requested", comment: "Needs more examples." });
    expect(rev1.status, JSON.stringify(rev1.body)).toBe(200);

    // ── Cycle 2 ───────────────────────────────────────────────────────────────
    // Owner addresses feedback and resubmits
    _currentUser = ownerUser;
    const sub2 = await request(app)
      .post(`/api/products/${PRODUCT_ID}/submit-review`);
    expect(sub2.status, JSON.stringify(sub2.body)).toBe(200);

    // Reviewer approves
    _currentUser = reviewerUser;
    const rev2 = await request(app)
      .post(`/api/products/${PRODUCT_ID}/review`)
      .send({ decision: "approved", comment: "Looks great now!" });
    expect(rev2.status, JSON.stringify(rev2.body)).toBe(200);

    // ── Verify history via GET ─────────────────────────────────────────────────
    _currentUser = ownerUser;
    const detail = await request(app).get(`/api/products/${PRODUCT_ID}`);
    expect(detail.status, JSON.stringify(detail.body)).toBe(200);

    const { reviewHistory, latestReview } = detail.body as {
      reviewHistory: Array<{ decision: string; comment: string; createdAt: string }>;
      latestReview: { decision: string; comment: string };
    };

    // Both decisions must be present
    expect(reviewHistory).toHaveLength(2);

    // Newest first: cycle-2 approval comes before cycle-1 changes_requested
    expect(reviewHistory[0].decision).toBe("approved");
    expect(reviewHistory[0].comment).toBe("Looks great now!");
    expect(reviewHistory[1].decision).toBe("changes_requested");
    expect(reviewHistory[1].comment).toBe("Needs more examples.");

    // Timestamps must confirm reverse-chronological order
    expect(new Date(reviewHistory[0].createdAt).getTime()).toBeGreaterThan(
      new Date(reviewHistory[1].createdAt).getTime(),
    );

    // latestReview must mirror reviewHistory[0]
    expect(latestReview).toEqual(reviewHistory[0]);
  });

  it("history is complete and ordered after three review cycles", async () => {
    // Cycle 1: changes_requested
    _currentUser = ownerUser;
    await request(app).post(`/api/products/${PRODUCT_ID}/submit-review`).expect(200);
    _currentUser = reviewerUser;
    await request(app)
      .post(`/api/products/${PRODUCT_ID}/review`)
      .send({ decision: "changes_requested", comment: "Round 1 feedback." })
      .expect(200);

    // Cycle 2: changes_requested again
    _currentUser = ownerUser;
    await request(app).post(`/api/products/${PRODUCT_ID}/submit-review`).expect(200);
    _currentUser = reviewerUser;
    await request(app)
      .post(`/api/products/${PRODUCT_ID}/review`)
      .send({ decision: "changes_requested", comment: "Round 2 feedback." })
      .expect(200);

    // Cycle 3: approved
    _currentUser = ownerUser;
    await request(app).post(`/api/products/${PRODUCT_ID}/submit-review`).expect(200);
    _currentUser = reviewerUser;
    await request(app)
      .post(`/api/products/${PRODUCT_ID}/review`)
      .send({ decision: "approved", comment: "Finally approved." })
      .expect(200);

    // GET and verify
    _currentUser = ownerUser;
    const detail = await request(app).get(`/api/products/${PRODUCT_ID}`);
    expect(detail.status, JSON.stringify(detail.body)).toBe(200);

    const { reviewHistory, latestReview } = detail.body as {
      reviewHistory: Array<{ decision: string; comment: string; createdAt: string }>;
      latestReview: { decision: string };
    };

    expect(reviewHistory).toHaveLength(3);

    // Newest → oldest: approved, changes_requested, changes_requested
    expect(reviewHistory[0].decision).toBe("approved");
    expect(reviewHistory[1].decision).toBe("changes_requested");
    expect(reviewHistory[2].decision).toBe("changes_requested");

    // Timestamps strictly descending
    for (let i = 0; i < reviewHistory.length - 1; i++) {
      expect(new Date(reviewHistory[i].createdAt).getTime()).toBeGreaterThan(
        new Date(reviewHistory[i + 1].createdAt).getTime(),
      );
    }

    // latestReview always mirrors reviewHistory[0]
    expect(latestReview).toEqual(reviewHistory[0]);
  });
});
