import { Router, type IRouter, type Request } from "express";
import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import {
  db,
  productsTable,
  productChaptersTable,
  usersTable,
  reviewsTable,
  commentsTable,
  salesCopyTable,
  type Product,
} from "@workspace/db";
import {
  GetProductsQueryParams,
  GetProductsResponse,
  CreateProductBody,
  CreateProductResponse,
  ImportManuscriptBody,
  ImportManuscriptResponse,
  GetProductResponse,
  UpdateProductBody,
  UpdateProductResponse,
  DuplicateProductResponse,
  ArchiveProductResponse,
  PublishProductBody,
  PublishProductResponse,
  UnpublishProductResponse,
  SubmitForReviewResponse,
  ReviewProductBody,
  ReviewProductResponse,
  AddChapterBody,
  AddChapterResponse,
  UpdateChapterBody,
  UpdateChapterResponse,
  DeleteChapterResponse,
  ReorderChaptersBody,
  ReorderChaptersResponse,
  GetCommentsResponse,
  AddCommentBody,
  AddCommentResponse,
  GetSalesCopyResponse,
  UpdateSalesCopyBody,
  UpdateSalesCopyResponse,
  GetReviewQueueResponse,
} from "@workspace/api-zod";
import {
  requireAuth,
  requireOnboarding,
  requirePermission,
} from "../middlewares/auth";
import { hasPermission } from "../lib/permissions";
import { serializeProduct, serializeChapter } from "../lib/serialize";
import { audit, notify, iso } from "../lib/helpers";
import { extractManuscriptText, splitIntoChapters } from "../lib/manuscript";
import { ObjectStorageService } from "../lib/objectStorage";

const objectStorageService = new ObjectStorageService();

const router: IRouter = Router();
router.use(requireAuth, requireOnboarding);

async function ownerName(ownerId: string): Promise<string> {
  const [u] = await db
    .select({ fullName: usersTable.fullName })
    .from(usersTable)
    .where(eq(usersTable.id, ownerId));
  return u?.fullName ?? "Unknown";
}

/** Load a product the current user may access; null → respond 404. */
async function loadAccessible(
  req: Request,
  productId: string,
): Promise<Product | null> {
  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, productId));
  if (!product) return null;
  const user = req.user!;
  if (
    product.ownerId !== user.id &&
    !hasPermission(user.role, "canViewAllProducts")
  ) {
    return null; // hide existence: 404 not 403
  }
  return product;
}

router.get("/products", async (req, res): Promise<void> => {
  const query = GetProductsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const user = req.user!;
  const q = query.data;
  const filters = [];
  if (!hasPermission(user.role, "canViewAllProducts")) {
    filters.push(eq(productsTable.ownerId, user.id));
  } else if (q.ownerId) {
    filters.push(eq(productsTable.ownerId, q.ownerId));
  }
  if (q.type) filters.push(eq(productsTable.type, q.type));
  if (q.status) filters.push(eq(productsTable.status, q.status));
  if (q.search) {
    filters.push(
      or(
        ilike(productsTable.title, `%${q.search}%`),
        ilike(productsTable.topic, `%${q.search}%`),
      )!,
    );
  }
  const rows = await db
    .select({ product: productsTable, ownerName: usersTable.fullName })
    .from(productsTable)
    .innerJoin(usersTable, eq(usersTable.id, productsTable.ownerId))
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(
      q.sort === "oldest"
        ? asc(productsTable.updatedAt)
        : q.sort === "title"
          ? asc(productsTable.title)
          : desc(productsTable.updatedAt),
    );
  const out = [];
  for (const row of rows) {
    out.push(await serializeProduct(row.product, row.ownerName));
  }
  res.json(GetProductsResponse.parse(out));
});

router.post(
  "/products",
  requirePermission("canCreateProduct"),
  async (req, res): Promise<void> => {
    const parsed = CreateProductBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const user = req.user!;
    const d = parsed.data;
    const [product] = await db
      .insert(productsTable)
      .values({
        ownerId: user.id,
        type: d.type,
        title: d.title,
        subtitle: d.subtitle ?? null,
        authorName: d.authorName ?? null,
        topic: d.topic,
        audience: d.audience ?? null,
        tone: d.tone ?? null,
        language: d.language ?? "English",
        depth: d.depth ?? "standard",
        region: d.region ?? null,
        lengthTier: d.lengthTier ?? null,
        keyPoints: d.keyPoints ?? null,
        ctaText: d.cta ?? null,
        leadMagnetFormat: d.leadMagnetFormat ?? null,
        requestedChapterCount: d.chapterCount ?? 8,
      })
      .returning();
    await audit({
      actorId: user.id,
      actorName: user.fullName,
      action: "product.created",
      entityType: "product",
      entityId: product.id,
      detail: `Created ${d.type === "lead_magnet" ? "lead magnet" : "eBook"} "${d.title}"`,
    });
    res
      .status(201)
      .json(
        CreateProductResponse.parse(
          await serializeProduct(product, user.fullName),
        ),
      );
  },
);

router.post(
  "/products/import-manuscript",
  requirePermission("canCreateProduct"),
  async (req, res): Promise<void> => {
    const parsed = ImportManuscriptBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const user = req.user!;

    let rawText: string;
    try {
      if (d.objectPath) {
        const file = await objectStorageService.getObjectEntityFile(d.objectPath);
        const [buffer] = await file.download();
        rawText = await extractManuscriptText(buffer, d.fileName || "");
      } else if (d.pastedText) {
        rawText = d.pastedText;
      } else {
        res.status(400).json({ error: "Provide either an uploaded file or pasted text" });
        return;
      }
    } catch (error) {
      req.log.error({ err: error }, "Failed to read/parse manuscript");
      res.status(400).json({ error: "Couldn't read that file. Try a .docx, .pdf, or pasted text instead." });
      return;
    }

    const parsedChapters = splitIntoChapters(rawText, d.title);
    if (parsedChapters.length === 0) {
      res.status(400).json({ error: "That manuscript looks empty — nothing to import." });
      return;
    }

    const [product] = await db
      .insert(productsTable)
      .values({
        ownerId: user.id,
        type: "ebook",
        title: d.title,
        status: "ready",
        requestedChapterCount: parsedChapters.length,
      })
      .returning();

    await db.insert(productChaptersTable).values(
      parsedChapters.map((c, i) => ({
        productId: product.id,
        orderIndex: i,
        title: c.title,
        contentMd: c.contentMd,
        status: "ready" as const,
      })),
    );

    await audit({
      actorId: user.id,
      actorName: user.fullName,
      action: "product.created",
      entityType: "product",
      entityId: product.id,
      detail: `Imported eBook "${d.title}" from an existing manuscript (${parsedChapters.length} chapters)`,
    });

    res
      .status(201)
      .json(
        ImportManuscriptResponse.parse(
          await serializeProduct(product, user.fullName),
        ),
      );
  },
);

router.get("/products/review-queue", requirePermission("canReview"), async (_req, res): Promise<void> => {
  const rows = await db
    .select({ product: productsTable, ownerName: usersTable.fullName })
    .from(productsTable)
    .innerJoin(usersTable, eq(usersTable.id, productsTable.ownerId))
    .where(eq(productsTable.status, "in_review"))
    .orderBy(asc(productsTable.updatedAt));
  const out = [];
  for (const row of rows) {
    out.push(await serializeProduct(row.product, row.ownerName));
  }
  res.json(GetReviewQueueResponse.parse(out));
});

router.get("/products/:productId", async (req, res): Promise<void> => {
  const product = await loadAccessible(req, String(req.params["productId"]));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  const chapters = await db
    .select()
    .from(productChaptersTable)
    .where(eq(productChaptersTable.productId, product.id))
    .orderBy(asc(productChaptersTable.orderIndex));
  const [latestReview] = await db
    .select({ review: reviewsTable, reviewerName: usersTable.fullName })
    .from(reviewsTable)
    .leftJoin(usersTable, eq(usersTable.id, reviewsTable.reviewerId))
    .where(eq(reviewsTable.productId, product.id))
    .orderBy(desc(reviewsTable.createdAt))
    .limit(1);
  res.json(
    GetProductResponse.parse({
      product: await serializeProduct(
        product,
        await ownerName(product.ownerId),
        chapters,
      ),
      chapters: chapters.map(serializeChapter),
      latestReview: latestReview
        ? {
            id: latestReview.review.id,
            productId: product.id,
            reviewerName: latestReview.reviewerName,
            decision: latestReview.review.decision,
            comment: latestReview.review.comment,
            decidedAt: latestReview.review.createdAt.toISOString(),
            createdAt: latestReview.review.createdAt.toISOString(),
          }
        : undefined,
    }),
  );
});

router.patch("/products/:productId", async (req, res): Promise<void> => {
  const product = await loadAccessible(req, String(req.params["productId"]));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [updated] = await db
    .update(productsTable)
    .set(parsed.data)
    .where(eq(productsTable.id, product.id))
    .returning();
  res.json(
    UpdateProductResponse.parse(
      await serializeProduct(updated, await ownerName(updated.ownerId)),
    ),
  );
});

router.post(
  "/products/:productId/duplicate",
  async (req, res): Promise<void> => {
    const product = await loadAccessible(req, String(req.params["productId"]));
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    const user = req.user!;
    const [copy] = await db
      .insert(productsTable)
      .values({
        ownerId: user.id,
        type: product.type,
        leadMagnetFormat: product.leadMagnetFormat,
        title: `${product.title} (copy)`,
        subtitle: product.subtitle,
        topic: product.topic,
        audience: product.audience,
        tone: product.tone,
        language: product.language,
        depth: product.depth,
        keyPoints: product.keyPoints,
        ctaText: product.ctaText,
        coverConfig: product.coverConfig,
        requestedChapterCount: product.requestedChapterCount,
        status: "draft",
      })
      .returning();
    const chapters = await db
      .select()
      .from(productChaptersTable)
      .where(eq(productChaptersTable.productId, product.id))
      .orderBy(asc(productChaptersTable.orderIndex));
    for (const ch of chapters) {
      await db.insert(productChaptersTable).values({
        productId: copy.id,
        orderIndex: ch.orderIndex,
        title: ch.title,
        summary: ch.summary,
        contentMd: ch.contentMd,
        status: ch.status === "failed" ? "pending" : ch.status,
      });
    }
    await audit({
      actorId: user.id,
      actorName: user.fullName,
      action: "product.duplicated",
      entityType: "product",
      entityId: copy.id,
      detail: `Duplicated "${product.title}"`,
    });
    res
      .status(201)
      .json(
        DuplicateProductResponse.parse(
          await serializeProduct(copy, user.fullName),
        ),
      );
  },
);

router.post("/products/:productId/archive", async (req, res): Promise<void> => {
  const product = await loadAccessible(req, String(req.params["productId"]));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  const [updated] = await db
    .update(productsTable)
    .set({ status: product.status === "archived" ? "draft" : "archived" })
    .where(eq(productsTable.id, product.id))
    .returning();
  res.json(
    ArchiveProductResponse.parse(
      await serializeProduct(updated, await ownerName(updated.ownerId)),
    ),
  );
});

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60) || "product"
  );
}

async function generateUniqueSlug(title: string): Promise<string> {
  const base = slugify(title);
  for (let i = 0; i < 25; i++) {
    const candidate = i === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
    const [existing] = await db
      .select({ id: productsTable.id })
      .from(productsTable)
      .where(eq(productsTable.slug, candidate));
    if (!existing) return candidate;
  }
  return `${base}-${Date.now()}`;
}

router.post(
  "/products/:productId/publish",
  async (req, res): Promise<void> => {
    const product = await loadAccessible(req, String(req.params["productId"]));
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    const parsed = PublishProductBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const slug = product.slug ?? (await generateUniqueSlug(product.title));
    const [updated] = await db
      .update(productsTable)
      .set({
        published: true,
        slug,
        priceCents: parsed.data.priceCents ?? product.priceCents,
      })
      .where(eq(productsTable.id, product.id))
      .returning();
    await audit({
      actorId: req.user!.id,
      actorName: req.user!.fullName,
      action: "product.published",
      entityType: "product",
      entityId: product.id,
      detail: `Published "${product.title}"`,
    });
    res.json(
      PublishProductResponse.parse(
        await serializeProduct(updated, await ownerName(updated.ownerId)),
      ),
    );
  },
);

router.post(
  "/products/:productId/unpublish",
  async (req, res): Promise<void> => {
    const product = await loadAccessible(req, String(req.params["productId"]));
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    const [updated] = await db
      .update(productsTable)
      .set({ published: false })
      .where(eq(productsTable.id, product.id))
      .returning();
    res.json(
      UnpublishProductResponse.parse(
        await serializeProduct(updated, await ownerName(updated.ownerId)),
      ),
    );
  },
);

router.post(
  "/products/:productId/submit-review",
  async (req, res): Promise<void> => {
    const product = await loadAccessible(req, String(req.params["productId"]));
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    const user = req.user!;
    const [updated] = await db
      .update(productsTable)
      .set({ status: "in_review" })
      .where(eq(productsTable.id, product.id))
      .returning();
    const reviewers = await db
      .select()
      .from(usersTable)
      .where(or(eq(usersTable.role, "admin"), eq(usersTable.role, "manager")));
    for (const r of reviewers) {
      if (r.id === user.id) continue;
      await notify({
        userId: r.id,
        type: "review",
        title: `"${product.title}" is ready for review`,
        body: `Submitted by ${user.fullName}`,
        linkPath: `/review`,
      });
    }
    await audit({
      actorId: user.id,
      actorName: user.fullName,
      action: "product.submitted_for_review",
      entityType: "product",
      entityId: product.id,
      detail: `Submitted "${product.title}" for review`,
    });
    res.json(
      SubmitForReviewResponse.parse(
        await serializeProduct(updated, await ownerName(updated.ownerId)),
      ),
    );
  },
);

router.post(
  "/products/:productId/review",
  requirePermission("canReview"),
  async (req, res): Promise<void> => {
    const parsed = ReviewProductBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const product = await loadAccessible(req, String(req.params["productId"]));
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    const user = req.user!;
    await db.insert(reviewsTable).values({
      productId: product.id,
      reviewerId: user.id,
      decision: parsed.data.decision,
      comment: parsed.data.comment ?? null,
    });
    const [updated] = await db
      .update(productsTable)
      .set({
        status:
          parsed.data.decision === "approved" ? "approved" : "changes_requested",
      })
      .where(eq(productsTable.id, product.id))
      .returning();
    await notify({
      userId: product.ownerId,
      type: "review",
      title:
        parsed.data.decision === "approved"
          ? `"${product.title}" was approved`
          : `Changes requested on "${product.title}"`,
      body: parsed.data.comment ?? undefined,
      linkPath: `/products/${product.id}`,
    });
    await audit({
      actorId: user.id,
      actorName: user.fullName,
      action: `product.${parsed.data.decision}`,
      entityType: "product",
      entityId: product.id,
      detail: `${parsed.data.decision === "approved" ? "Approved" : "Requested changes on"} "${product.title}"`,
    });
    res.json(
      ReviewProductResponse.parse(
        await serializeProduct(updated, await ownerName(updated.ownerId)),
      ),
    );
  },
);

// ---- Chapters ----

router.post("/products/:productId/chapters", async (req, res): Promise<void> => {
  const product = await loadAccessible(req, String(req.params["productId"]));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  const parsed = AddChapterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const existing = await db
    .select()
    .from(productChaptersTable)
    .where(eq(productChaptersTable.productId, product.id));
  const [chapter] = await db
    .insert(productChaptersTable)
    .values({
      productId: product.id,
      orderIndex: existing.length,
      title: parsed.data.title,
      summary: parsed.data.summary ?? null,
      contentMd: parsed.data.contentMd ?? null,
      status: parsed.data.contentMd ? "ready" : "pending",
    })
    .returning();
  res.status(201).json(AddChapterResponse.parse(serializeChapter(chapter)));
});

router.patch(
  "/products/:productId/chapters/:chapterId",
  async (req, res): Promise<void> => {
    const product = await loadAccessible(req, String(req.params["productId"]));
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    const parsed = UpdateChapterBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const patch: Record<string, unknown> = { ...parsed.data };
    if (parsed.data.contentMd !== undefined) patch["status"] = "ready";
    const [chapter] = await db
      .update(productChaptersTable)
      .set(patch)
      .where(
        and(
          eq(productChaptersTable.id, String(req.params["chapterId"])),
          eq(productChaptersTable.productId, product.id),
        ),
      )
      .returning();
    if (!chapter) {
      res.status(404).json({ error: "Chapter not found" });
      return;
    }
    res.json(UpdateChapterResponse.parse(serializeChapter(chapter)));
  },
);

router.delete(
  "/products/:productId/chapters/:chapterId",
  async (req, res): Promise<void> => {
    const product = await loadAccessible(req, String(req.params["productId"]));
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    const [deleted] = await db
      .delete(productChaptersTable)
      .where(
        and(
          eq(productChaptersTable.id, String(req.params["chapterId"])),
          eq(productChaptersTable.productId, product.id),
        ),
      )
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "Chapter not found" });
      return;
    }
    res.json(DeleteChapterResponse.parse({ ok: true }));
  },
);

router.post(
  "/products/:productId/chapters/reorder",
  async (req, res): Promise<void> => {
    const product = await loadAccessible(req, String(req.params["productId"]));
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    const parsed = ReorderChaptersBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    let idx = 0;
    for (const chapterId of parsed.data.chapterIds) {
      await db
        .update(productChaptersTable)
        .set({ orderIndex: idx++ })
        .where(
          and(
            eq(productChaptersTable.id, chapterId),
            eq(productChaptersTable.productId, product.id),
          ),
        );
    }
    res.json(ReorderChaptersResponse.parse({ ok: true }));
  },
);

// ---- Comments ----

router.get("/products/:productId/comments", async (req, res): Promise<void> => {
  const product = await loadAccessible(req, String(req.params["productId"]));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  const rows = await db
    .select({ comment: commentsTable, authorName: usersTable.fullName })
    .from(commentsTable)
    .leftJoin(usersTable, eq(usersTable.id, commentsTable.authorId))
    .where(eq(commentsTable.productId, product.id))
    .orderBy(asc(commentsTable.createdAt));
  res.json(
    GetCommentsResponse.parse(
      rows.map((r) => ({
        id: r.comment.id,
        productId: r.comment.productId,
        chapterId: r.comment.chapterId,
        authorId: r.comment.authorId ?? "",
        authorName: r.authorName ?? "Unknown",
        body: r.comment.body,
        createdAt: r.comment.createdAt.toISOString(),
      })),
    ),
  );
});

router.post("/products/:productId/comments", async (req, res): Promise<void> => {
  const product = await loadAccessible(req, String(req.params["productId"]));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  const parsed = AddCommentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = req.user!;
  const [comment] = await db
    .insert(commentsTable)
    .values({
      productId: product.id,
      chapterId: parsed.data.chapterId ?? null,
      authorId: user.id,
      body: parsed.data.body,
    })
    .returning();
  if (product.ownerId !== user.id) {
    await notify({
      userId: product.ownerId,
      type: "comment",
      title: `${user.fullName} commented on "${product.title}"`,
      body: parsed.data.body.slice(0, 120),
      linkPath: `/products/${product.id}`,
    });
  }
  res.status(201).json(
    AddCommentResponse.parse({
      id: comment.id,
      productId: comment.productId,
      chapterId: comment.chapterId,
      authorId: user.id,
      authorName: user.fullName,
      body: comment.body,
      createdAt: comment.createdAt.toISOString(),
    }),
  );
});

// ---- Sales copy ----

function serializeSalesCopy(
  productId: string,
  row?: typeof salesCopyTable.$inferSelect,
) {
  return {
    productId,
    headline: row?.headline ?? null,
    subheadline: row?.subheadline ?? null,
    bullets: (row?.bullets ?? []) as string[],
    whoItsFor: row?.whoItsFor ?? null,
    faq: (row?.faq ?? []) as { question: string; answer: string }[],
    ctaText: row?.ctaText ?? null,
    suggestedPriceBand: row?.suggestedPriceBand ?? null,
    updatedAt: row ? iso(row.updatedAt) : null,
  };
}

router.get("/products/:productId/sales-copy", async (req, res): Promise<void> => {
  const product = await loadAccessible(req, String(req.params["productId"]));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  const [row] = await db
    .select()
    .from(salesCopyTable)
    .where(eq(salesCopyTable.productId, product.id));
  res.json(GetSalesCopyResponse.parse(serializeSalesCopy(product.id, row)));
});

router.put("/products/:productId/sales-copy", async (req, res): Promise<void> => {
  const product = await loadAccessible(req, String(req.params["productId"]));
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }
  const parsed = UpdateSalesCopyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const values = {
    headline: parsed.data.headline ?? null,
    subheadline: parsed.data.subheadline ?? null,
    bullets: parsed.data.bullets ?? [],
    whoItsFor: parsed.data.whoItsFor ?? null,
    faq: parsed.data.faq ?? [],
    ctaText: parsed.data.ctaText ?? null,
    suggestedPriceBand: parsed.data.suggestedPriceBand ?? null,
  };
  const [row] = await db
    .insert(salesCopyTable)
    .values({ productId: product.id, ...values })
    .onConflictDoUpdate({ target: salesCopyTable.productId, set: values })
    .returning();
  res.json(UpdateSalesCopyResponse.parse(serializeSalesCopy(product.id, row)));
});

export default router;
