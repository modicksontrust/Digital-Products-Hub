/**
 * Regression tests for bio ownership and public visibility.
 *
 * The database mock evaluates the ownership predicate passed to each query.
 * This keeps the tests meaningful if a handler accidentally drops the
 * `userId = req.user.id` condition.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import request from "supertest";
import type { User } from "@workspace/db";

type Condition =
  | { type: "eq"; column: unknown; value: unknown }
  | { type: "and"; conditions: Condition[] };
type QueryResult = unknown[] | ((where: Condition | undefined) => unknown[]);

let currentUser: User;
const selectQueue: QueryResult[] = [];
const updateQueue: QueryResult[] = [];
const deleteQueue: QueryResult[] = [];

function makeChain(result: QueryResult) {
  let where: Condition | undefined;
  const chain: Record<string, any> = {};

  for (const method of [
    "from",
    "orderBy",
    "values",
    "set",
    "returning",
    "onConflictDoNothing",
  ]) {
    chain[method] = vi.fn(() => chain);
  }
  chain.where = vi.fn((condition: Condition) => {
    where = condition;
    return chain;
  });
  chain.then = (
    resolve: Parameters<Promise<unknown>["then"]>[0],
    reject: Parameters<Promise<unknown>["then"]>[1],
  ) => Promise.resolve(typeof result === "function" ? result(where) : result).then(resolve, reject);
  chain.catch = (reject: Parameters<Promise<unknown>["catch"]>[0]) =>
    Promise.resolve(typeof result === "function" ? result(where) : result).catch(reject);
  chain.finally = (fin: Parameters<Promise<unknown>["finally"]>[0]) =>
    Promise.resolve(typeof result === "function" ? result(where) : result).finally(fin);
  return chain;
}

vi.mock("drizzle-orm", () => ({
  and: (...conditions: Condition[]) => ({ type: "and", conditions }),
  asc: vi.fn(() => ({})),
  eq: (column: unknown, value: unknown) => ({ type: "eq", column, value }),
}));

vi.mock("@workspace/db", () => {
  const bioSettingsTable = {
    id: "bioSettings.id",
    userId: "bioSettings.userId",
    slug: "bioSettings.slug",
  };
  const bioLinksTable = {
    id: "bioLinks.id",
    userId: "bioLinks.userId",
    sortOrder: "bioLinks.sortOrder",
    createdAt: "bioLinks.createdAt",
  };
  const tableStub = {};
  return {
    db: {
      select: vi.fn(() => makeChain(selectQueue.shift() ?? [])),
      update: vi.fn(() => makeChain(updateQueue.shift() ?? [])),
      delete: vi.fn(() => makeChain(deleteQueue.shift() ?? [])),
      insert: vi.fn(() => makeChain([])),
      transaction: vi.fn(async (callback: (tx: unknown) => unknown) =>
        callback({
          update: vi.fn(() => makeChain([])),
        }),
      ),
    },
    bioSettingsTable,
    bioLinksTable,
    usersTable: tableStub,
    productsTable: tableStub,
    productChaptersTable: tableStub,
  };
});

vi.mock("@workspace/api-zod", async () => {
  const actual = await vi.importActual<typeof import("@workspace/api-zod")>(
    "@workspace/api-zod",
  );
  const identity = { parse: (value: unknown) => value };
  return {
    ...actual,
    BioLinkItem: identity,
    GetBioResponse: identity,
    GetPublicBioResponse: identity,
  };
});

vi.mock("../middlewares/auth.js", () => ({
  requireAuth: (req: Request, _res: Response, next: NextFunction) => {
    (req as Request & { user: User }).user = currentUser;
    next();
  },
  requireOnboarding: (
    _req: Request,
    _res: Response,
    next: NextFunction,
  ) => next(),
}));

const { default: bioRouter } = await import("./bio.js");
const { default: publicRouter } = await import("./public.js");
const { bioLinksTable } = await import("@workspace/db");

const OWNER_ID = "owner-user-id";
const OTHER_USER_ID = "other-user-id";

const ownerUser = {
  id: OWNER_ID,
  email: "owner@example.com",
  fullName: "Owner",
  role: "creator",
  status: "active",
  onboardingComplete: true,
  onboardingExempt: false,
} as User;

const ownerSettings = {
  id: "owner-settings-id",
  userId: OWNER_ID,
  slug: "owner-page",
  displayName: "Owner",
  bio: "",
  avatarUrl: null,
  theme: "noir",
  published: true,
  showProducts: false,
  socialLinks: [],
};

const otherLink = {
  id: "other-link-id",
  userId: OTHER_USER_ID,
  title: "Other user's link",
  url: "https://example.com/other",
  active: true,
  sortOrder: 0,
};

function buildApp(router: express.Router) {
  const app = express();
  app.use(express.json());
  app.use(router);
  return app;
}

function hasOwnershipCondition(
  condition: Condition | undefined,
  userId: string,
): boolean {
  if (!condition) return false;
  if (condition.type === "eq") {
    return condition.column === bioLinksTable.userId && condition.value === userId;
  }
  return condition.conditions.some((nested) =>
    hasOwnershipCondition(nested, userId),
  );
}

beforeEach(() => {
  currentUser = ownerUser;
  selectQueue.length = 0;
  updateQueue.length = 0;
  deleteQueue.length = 0;
  vi.clearAllMocks();
});

describe("bio link ownership", () => {
  it("rejects PATCH attempts against another user's link", async () => {
    updateQueue.push((where) =>
      hasOwnershipCondition(where, OWNER_ID) ? [] : [otherLink],
    );

    const res = await request(buildApp(bioRouter))
      .patch(`/bio/links/${otherLink.id}`)
      .send({ title: "Hijacked link" });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Link not found" });
  });

  it("rejects DELETE attempts against another user's link", async () => {
    deleteQueue.push((where) =>
      hasOwnershipCondition(where, OWNER_ID) ? [] : [otherLink],
    );

    const res = await request(buildApp(bioRouter)).delete(
      `/bio/links/${otherLink.id}`,
    );

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Link not found" });
  });

  it("rejects reorder attempts containing another user's link", async () => {
    selectQueue.push((where) =>
      hasOwnershipCondition(where, OWNER_ID) ? [] : [otherLink],
    );

    const res = await request(buildApp(bioRouter))
      .put("/bio/links/reorder")
      .send({ ids: [otherLink.id] });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: "ids must be an exact permutation of your link ids",
    });
  });
});

describe("bio settings and URL validation", () => {
  it("returns 409 when a creator tries to claim another user's slug", async () => {
    selectQueue.push([ownerSettings]);
    selectQueue.push([{ userId: OTHER_USER_ID }]);

    const res = await request(buildApp(bioRouter))
      .put("/bio/settings")
      .send({ slug: "other-users-page" });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: "That URL is already taken" });
  });

  it.each([
    ["link creation", "post", "/bio/links", { title: "Unsafe", url: "javascript:alert(1)" }],
    ["avatar update", "put", "/bio/settings", { avatarUrl: "javascript:alert(1)" }],
  ])("rejects javascript: URLs in %s", async (_label, method, path, body) => {
    const res = await request(buildApp(bioRouter))[method as "post" | "put"](
      path,
    ).send(body);

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/http\(s\) URL|valid/i);
  });
});

describe("public bio visibility", () => {
  it("returns 404 for an unpublished bio", async () => {
    selectQueue.push([{ ...ownerSettings, published: false }]);

    const res = await request(buildApp(publicRouter)).get(
      "/public/bio/owner-page",
    );

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Not found" });
  });
});