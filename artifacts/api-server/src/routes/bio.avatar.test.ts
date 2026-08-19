/**
 * Authorization checks for uploaded bio avatars.
 *
 * Storage object paths are private by default. A creator may only attach an
 * object registered through their own avatar upload flow, never another
 * user's generic upload path.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import express, { type NextFunction, type Request, type Response } from "express";
import request from "supertest";

const selectQueue: unknown[][] = [];
const dbMocks = vi.hoisted(() => ({
  update: vi.fn(),
}));
const objectStorageMocks = vi.hoisted(() => ({
  getObjectEntityFile: vi.fn(),
  downloadObject: vi.fn(),
}));

function makeChain(result: unknown[]) {
  const resultPromise = Promise.resolve(result);
  const chain: Record<string, unknown> = {};
  for (const method of ["from", "where", "orderBy"]) {
    chain[method] = () => chain;
  }
  chain["then"] = (
    resolve: Parameters<Promise<unknown>["then"]>[0],
    reject: Parameters<Promise<unknown>["then"]>[1],
  ) => resultPromise.then(resolve, reject);
  return chain;
}

const currentUser = {
  id: "11111111-1111-4111-8111-111111111111",
  fullName: "Alice Creator",
  role: "creator",
};

vi.mock("@workspace/db", () => {
  const tableStub = {} as const;
  return {
    db: {
      select: vi.fn(() => makeChain(selectQueue.shift() ?? [])),
      update: dbMocks.update,
    },
    bioAnalyticsEventsTable: tableStub,
    bioSettingsTable: tableStub,
    bioLinksTable: tableStub,
    bioAvatarUploadsTable: tableStub,
  };
});

vi.mock("../middlewares/auth.js", () => ({
  requireAuth: (req: Request, _res: Response, next: NextFunction) => {
    req.user = currentUser as NonNullable<typeof req.user>;
    next();
  },
  requireOnboarding: (_req: Request, _res: Response, next: NextFunction) =>
    next(),
}));

vi.mock("../lib/objectStorage.js", () => ({
  ObjectStorageService: class {
    getObjectEntityFile = objectStorageMocks.getObjectEntityFile;
    downloadObject = objectStorageMocks.downloadObject;
  },
  ObjectNotFoundError: class ObjectNotFoundError extends Error {},
}));

import bioRouter from "./bio.js";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(bioRouter);
  return app;
}

const EXISTING_SETTINGS = {
  userId: currentUser.id,
  slug: "alice",
  displayName: "Alice Creator",
  bio: "",
  avatarUrl: null,
  theme: "noir",
  published: true,
  showProducts: true,
  socialLinks: [],
};

describe("PUT /bio/settings uploaded avatar authorization", () => {
  beforeEach(() => {
    selectQueue.length = 0;
    vi.clearAllMocks();
  });

  it("rejects another creator's registered avatar path", async () => {
    // Existing settings, then no registration owned by the authenticated user.
    // The missing row represents a path that belongs to a different creator.
    selectQueue.push([EXISTING_SETTINGS], []);

    const response = await request(buildApp())
      .put("/bio/settings")
      .send({
        slug: "alice",
        displayName: "Alice Creator",
        bio: "",
        avatarUrl: "/objects/uploads/someone-elses-avatar",
        theme: "noir",
        published: true,
        showProducts: true,
        socialLinks: [],
      });

    expect(response.status).toBe(403);
    expect(response.body.error).toContain("doesn't belong to you");
    expect(dbMocks.update).not.toHaveBeenCalled();
  });

  it("rejects a registered upload whose bytes are not a safe image", async () => {
    selectQueue.push(
      [EXISTING_SETTINGS],
      [{ id: "avatar-registration" }],
    );
    objectStorageMocks.getObjectEntityFile.mockResolvedValue({});
    objectStorageMocks.downloadObject.mockResolvedValue(
      new Response("<script>window.pwned = true</script>", {
        headers: { "Content-Type": "image/png" },
      }),
    );

    const response = await request(buildApp())
      .put("/bio/settings")
      .send({ avatarUrl: "/objects/uploads/forged-image" });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("JPEG, PNG, or WebP");
    expect(dbMocks.update).not.toHaveBeenCalled();
  });

  it("refuses an unsupported image declaration before issuing an upload URL", async () => {
    const response = await request(buildApp())
      .post("/bio/avatar/uploads/request-url")
      .send({
        name: "avatar.svg",
        size: 512,
        contentType: "image/svg+xml",
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain("JPEG, PNG, or WebP");
  });
});
