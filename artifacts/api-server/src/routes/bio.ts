import { Router, type IRouter } from "express";
import { and, asc, count, eq } from "drizzle-orm";
import {
  db,
  bioAnalyticsEventsTable,
  bioSettingsTable,
  bioLinksTable,
} from "@workspace/db";
import {
  GetBioAnalyticsResponse,
  GetBioResponse,
  UpdateBioSettingsBody,
  CreateBioLinkBody,
  UpdateBioLinkBody,
  ReorderBioLinksBody,
  BioLinkItem,
} from "@workspace/api-zod";
import { requireAuth, requireOnboarding } from "../middlewares/auth";

const router: IRouter = Router();
router.use(requireAuth, requireOnboarding);

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "creator"
  );
}

async function ensureSettings(userId: string, fullName: string) {
  const [existing] = await db
    .select()
    .from(bioSettingsTable)
    .where(eq(bioSettingsTable.userId, userId));
  if (existing) return existing;

  // Generate a unique slug from the user's name.
  const base = slugify(fullName);
  let slug = base;
  for (let i = 0; i < 20; i++) {
    const [taken] = await db
      .select({ id: bioSettingsTable.id })
      .from(bioSettingsTable)
      .where(eq(bioSettingsTable.slug, slug));
    if (!taken) break;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }

  const [created] = await db
    .insert(bioSettingsTable)
    .values({ userId, slug, displayName: fullName })
    .onConflictDoNothing({ target: bioSettingsTable.userId })
    .returning();
  if (created) return created;
  const [row] = await db
    .select()
    .from(bioSettingsTable)
    .where(eq(bioSettingsTable.userId, userId));
  return row!;
}

function serializeSettings(s: typeof bioSettingsTable.$inferSelect) {
  return {
    slug: s.slug,
    displayName: s.displayName,
    bio: s.bio,
    avatarUrl: s.avatarUrl ?? null,
    theme: s.theme,
    published: s.published,
    showProducts: s.showProducts,
    socialLinks:
      (s.socialLinks as { platform: string; url: string }[] | null) ?? [],
  };
}

function serializeLink(l: typeof bioLinksTable.$inferSelect) {
  return {
    id: l.id,
    title: l.title,
    url: l.url,
    active: l.active,
    sortOrder: l.sortOrder,
  };
}

async function loadLinks(userId: string) {
  return db
    .select()
    .from(bioLinksTable)
    .where(eq(bioLinksTable.userId, userId))
    .orderBy(asc(bioLinksTable.sortOrder), asc(bioLinksTable.createdAt));
}

router.get("/bio", async (req, res): Promise<void> => {
  const user = req.user!;
  const settings = await ensureSettings(user.id, user.fullName);
  const links = await loadLinks(user.id);
  res.json(
    GetBioResponse.parse({
      settings: serializeSettings(settings),
      links: links.map(serializeLink),
    }),
  );
});

router.get("/bio/analytics", async (req, res): Promise<void> => {
  const user = req.user!;
  const [pageViewRows, linkClickRows] = await Promise.all([
    db
      .select({ count: count() })
      .from(bioAnalyticsEventsTable)
      .where(
        and(
          eq(bioAnalyticsEventsTable.userId, user.id),
          eq(bioAnalyticsEventsTable.eventType, "page_view"),
        ),
      ),
    db
      .select({
        linkId: bioAnalyticsEventsTable.bioLinkId,
        clicks: count(),
      })
      .from(bioAnalyticsEventsTable)
      .where(
        and(
          eq(bioAnalyticsEventsTable.userId, user.id),
          eq(bioAnalyticsEventsTable.eventType, "link_click"),
        ),
      )
      .groupBy(bioAnalyticsEventsTable.bioLinkId),
  ]);

  res.json(
    GetBioAnalyticsResponse.parse({
      pageViews: Number(pageViewRows[0]?.count ?? 0),
      linkClicks: linkClickRows
        .filter((row) => row.linkId !== null)
        .map((row) => ({
          linkId: row.linkId!,
          clicks: Number(row.clicks),
        })),
    }),
  );
});

router.put("/bio/settings", async (req, res): Promise<void> => {
  const user = req.user!;
  const parsed = UpdateBioSettingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  await ensureSettings(user.id, user.fullName);

  if (parsed.data.slug) {
    const [taken] = await db
      .select({ userId: bioSettingsTable.userId })
      .from(bioSettingsTable)
      .where(eq(bioSettingsTable.slug, parsed.data.slug));
    if (taken && taken.userId !== user.id) {
      res.status(409).json({ error: "That URL is already taken" });
      return;
    }
  }

  const [updated] = await db
    .update(bioSettingsTable)
    .set(parsed.data)
    .where(eq(bioSettingsTable.userId, user.id))
    .returning();
  res.json({ settings: serializeSettings(updated!) });
});

router.post("/bio/links", async (req, res): Promise<void> => {
  const user = req.user!;
  const parsed = CreateBioLinkBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  const existing = await loadLinks(user.id);
  const [created] = await db
    .insert(bioLinksTable)
    .values({
      userId: user.id,
      title: parsed.data.title,
      url: parsed.data.url,
      sortOrder: existing.length,
    })
    .returning();
  res.status(201).json(BioLinkItem.parse(serializeLink(created!)));
});

router.patch("/bio/links/:id", async (req, res): Promise<void> => {
  const user = req.user!;
  const parsed = UpdateBioLinkBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  const [updated] = await db
    .update(bioLinksTable)
    .set(parsed.data)
    .where(
      and(
        eq(bioLinksTable.id, String(req.params["id"])),
        eq(bioLinksTable.userId, user.id),
      ),
    )
    .returning();
  if (!updated) {
    res.status(404).json({ error: "Link not found" });
    return;
  }
  res.json(BioLinkItem.parse(serializeLink(updated)));
});

router.delete("/bio/links/:id", async (req, res): Promise<void> => {
  const user = req.user!;
  const [deleted] = await db
    .delete(bioLinksTable)
    .where(
      and(
        eq(bioLinksTable.id, String(req.params["id"])),
        eq(bioLinksTable.userId, user.id),
      ),
    )
    .returning();
  if (!deleted) {
    res.status(404).json({ error: "Link not found" });
    return;
  }
  res.json({ ok: true });
});

router.put("/bio/links/reorder", async (req, res): Promise<void> => {
  const user = req.user!;
  const parsed = ReorderBioLinksBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const ids = parsed.data.ids;
  // Require an exact, duplicate-free permutation of the caller's link ids so a
  // partial or malformed reorder can never corrupt sortOrder.
  const owned = await db
    .select({ id: bioLinksTable.id })
    .from(bioLinksTable)
    .where(eq(bioLinksTable.userId, user.id));
  const ownedIds = new Set(owned.map((r) => r.id));
  const unique = new Set(ids);
  if (
    unique.size !== ids.length ||
    ids.length !== ownedIds.size ||
    ids.some((id) => !ownedIds.has(id))
  ) {
    res.status(400).json({ error: "ids must be an exact permutation of your link ids" });
    return;
  }
  await db.transaction(async (tx) => {
    for (let i = 0; i < ids.length; i++) {
      await tx
        .update(bioLinksTable)
        .set({ sortOrder: i })
        .where(
          and(
            eq(bioLinksTable.id, ids[i]!),
            eq(bioLinksTable.userId, user.id),
          ),
        );
    }
  });
  const links = await loadLinks(user.id);
  res.json({ links: links.map(serializeLink) });
});

export default router;
