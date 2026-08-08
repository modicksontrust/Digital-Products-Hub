import { Router, type IRouter, type Request, type Response } from "express";
import { asc, eq } from "drizzle-orm";
import {
  db,
  productsTable,
  productChaptersTable,
  generationJobsTable,
  usersTable,
  brandKitTable,
  productExportsTable,
  type Product,
} from "@workspace/db";
import fs from "node:fs";
import path from "node:path";
import {
  GenerateOutlineBody,
  GenerateOutlineResponse,
  GenerateChaptersBody,
  GenerateChaptersResponse,
  RewriteChapterBody,
  RewriteChapterResponse,
  GenerateSalesCopyBody,
  GenerateSalesCopyResponse,
  GenerateLeadMagnetBody,
  GenerateLeadMagnetResponse,
  GenerateNicheSuggestionsBody,
  GenerateNicheSuggestionsResponse,
  GetJobResponse,
  ExportProductBody,
  ExportProductResponse,
  GetProductExportsResponse,
} from "@workspace/api-zod";
import { aiJson } from "../lib/ai";
import {
  requireAuth,
  requireOnboarding,
} from "../middlewares/auth";
import { hasPermission } from "../lib/permissions";
import {
  spendCredits,
  getCreditCost,
  InsufficientCreditsError,
  audit,
} from "../lib/helpers";
import {
  createJob,
  serializeJob,
  runOutlineJob,
  runChaptersJob,
  runRewriteJob,
  runSalesCopyJob,
  runLeadMagnetJob,
} from "../lib/jobs";
import {
  renderProductPdf,
  renderProductMarkdown,
  EXPORT_DIR,
} from "../lib/pdf";

const router: IRouter = Router();
router.use(requireAuth, requireOnboarding);

async function loadOwnedProduct(
  req: Request,
  res: Response,
  productId: string,
): Promise<Product | null> {
  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, productId));
  const user = req.user!;
  if (
    !product ||
    (product.ownerId !== user.id &&
      !hasPermission(user.role, "canViewAllProducts"))
  ) {
    res.status(404).json({ error: "Product not found" });
    return null;
  }
  return product;
}

async function chargeOr402(
  req: Request,
  res: Response,
  actionKey: string,
  units = 1,
): Promise<number | null> {
  const cost = (await getCreditCost(actionKey)) * units;
  try {
    await spendCredits({
      userId: req.user!.id,
      amount: cost,
      actionKey,
    });
    return cost;
  } catch (err) {
    if (err instanceof InsufficientCreditsError) {
      res.status(402).json({
        error: `You need ${err.required} credits for this action but have ${err.balance}.`,
        code: "INSUFFICIENT_CREDITS",
      });
      return null;
    }
    throw err;
  }
}

const NICHE_LABELS: Record<string, string> = {
  health_wellness: "Health & Wellness",
  wealth_money: "Wealth & Money",
  relationships: "Relationships",
};

router.post("/generate/niche-suggestions", async (req, res): Promise<void> => {
  const parsed = GenerateNicheSuggestionsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const nicheLabel = NICHE_LABELS[parsed.data.niche] ?? parsed.data.niche;
  // Exploratory / free — helps pick a starting point before any credits are spent.
  const subNiches = await aiJson<
    { title: string; hook: string; suggestedTopic: string; suggestedAudience: string; trending?: boolean; sellabilityScore: number }[]
  >(
    "You are a digital-product market researcher who tracks what self-published eBooks and lead magnets are currently selling well.",
    `Give me 8 of the most trending, hot, and most-searched-for sub-niches right now inside the "${nicheLabel}" niche for a self-published eBook or PDF guide business.

For each sub-niche return an object with:
- "title": a short sub-niche name (2-5 words)
- "hook": a punchy one-sentence pain-point or desire that this sub-niche's audience is searching for
- "suggestedTopic": a specific eBook topic/angle inside this sub-niche, phrased as a working title
- "suggestedAudience": a specific target audience description for that topic
- "trending": true if this is currently especially hot/rising in search interest, otherwise false
- "sellabilityScore": your honest 0-100 estimate of how well this specific topic is likely to sell as a self-published eBook right now (demand, competition, willingness to pay)

Order the list with the highest "sellabilityScore" first. Respond as a JSON array of exactly 8 objects, no other text.`,
  );
  res.json(
    GenerateNicheSuggestionsResponse.parse({
      niche: parsed.data.niche,
      subNiches,
    }),
  );
});

router.post("/generate/outline", async (req, res): Promise<void> => {
  const parsed = GenerateOutlineBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const product = await loadOwnedProduct(req, res, parsed.data.productId);
  if (!product) return;
  const charged = await chargeOr402(req, res, "outline");
  if (charged === null) return;
  const job = await createJob({
    productId: product.id,
    userId: req.user!.id,
    type: "outline",
    progressLabel: "Designing your outline",
  });
  runOutlineJob(job.id, product.id);
  res.status(202).json(GenerateOutlineResponse.parse(serializeJob(job, charged)));
});

router.post("/generate/chapters", async (req, res): Promise<void> => {
  const parsed = GenerateChaptersBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const product = await loadOwnedProduct(req, res, parsed.data.productId);
  if (!product) return;
  const chapters = await db
    .select()
    .from(productChaptersTable)
    .where(eq(productChaptersTable.productId, product.id));
  const targets = parsed.data.chapterIds?.length
    ? chapters.filter((c) => parsed.data.chapterIds!.includes(c.id))
    : chapters;
  if (!targets.length) {
    res.status(400).json({ error: "No chapters to generate — create an outline first" });
    return;
  }
  const charged = await chargeOr402(req, res, "chapter", targets.length);
  if (charged === null) return;
  const job = await createJob({
    productId: product.id,
    userId: req.user!.id,
    type: "chapters",
    totalUnits: targets.length,
    progressLabel: "Preparing to write",
  });
  runChaptersJob(job.id, product.id, parsed.data.chapterIds);
  res
    .status(202)
    .json(GenerateChaptersResponse.parse(serializeJob(job, charged)));
});

router.post(
  "/generate/chapters/:chapterId/rewrite",
  async (req, res): Promise<void> => {
    const parsed = RewriteChapterBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const product = await loadOwnedProduct(req, res, parsed.data.productId);
    if (!product) return;
    const chapterId = String(req.params["chapterId"]);
    const [chapter] = await db
      .select()
      .from(productChaptersTable)
      .where(eq(productChaptersTable.id, chapterId));
    if (!chapter || chapter.productId !== product.id) {
      res.status(404).json({ error: "Chapter not found" });
      return;
    }
    const charged = await chargeOr402(req, res, "rewrite");
    if (charged === null) return;
    const job = await createJob({
      productId: product.id,
      userId: req.user!.id,
      type: "rewrite",
      progressLabel: `Rewriting "${chapter.title}"`,
    });
    runRewriteJob(
      job.id,
      product.id,
      chapterId,
      parsed.data.instruction,
      parsed.data.tone,
    );
    res
      .status(202)
      .json(RewriteChapterResponse.parse(serializeJob(job, charged)));
  },
);

router.post("/generate/sales-copy", async (req, res): Promise<void> => {
  const parsed = GenerateSalesCopyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const product = await loadOwnedProduct(req, res, parsed.data.productId);
  if (!product) return;
  const charged = await chargeOr402(req, res, "sales_copy");
  if (charged === null) return;
  const job = await createJob({
    productId: product.id,
    userId: req.user!.id,
    type: "sales_copy",
    progressLabel: "Writing sales copy",
  });
  runSalesCopyJob(job.id, product.id);
  res
    .status(202)
    .json(GenerateSalesCopyResponse.parse(serializeJob(job, charged)));
});

router.post("/generate/lead-magnet", async (req, res): Promise<void> => {
  const parsed = GenerateLeadMagnetBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const product = await loadOwnedProduct(req, res, parsed.data.productId);
  if (!product) return;
  const charged = await chargeOr402(req, res, "lead_magnet");
  if (charged === null) return;
  const job = await createJob({
    productId: product.id,
    userId: req.user!.id,
    type: "lead_magnet",
    progressLabel: "Creating your lead magnet",
  });
  runLeadMagnetJob(job.id, product.id);
  res
    .status(202)
    .json(GenerateLeadMagnetResponse.parse(serializeJob(job, charged)));
});

router.get("/jobs/:jobId", async (req, res): Promise<void> => {
  const [job] = await db
    .select()
    .from(generationJobsTable)
    .where(eq(generationJobsTable.id, String(req.params["jobId"])));
  if (!job || job.userId !== req.user!.id) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  res.json(GetJobResponse.parse(serializeJob(job)));
});

// ---- Exports ----

function serializeExport(
  row: typeof productExportsTable.$inferSelect,
  createdByName: string | null,
) {
  return {
    id: row.id,
    productId: row.productId,
    format: row.format,
    versionLabel: `v${row.version}`,
    pageCount: row.pageCount,
    fileSizeBytes: row.fileSizeBytes,
    downloadUrl: `/api/exports/${row.id}/download`,
    createdByName,
    createdAt: row.createdAt.toISOString(),
  };
}

router.post("/products/:productId/exports", async (req, res): Promise<void> => {
  const product = await loadOwnedProduct(
    req,
    res,
    String(req.params["productId"]),
  );
  if (!product) return;
  const parsed = ExportProductBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const format = parsed.data.format ?? "pdf";
  const pageSize = parsed.data.pageSize ?? "a4";
  const chapters = await db
    .select()
    .from(productChaptersTable)
    .where(eq(productChaptersTable.productId, product.id))
    .orderBy(asc(productChaptersTable.orderIndex));
  if (!chapters.length) {
    res.status(400).json({ error: "This product has no content to export yet" });
    return;
  }
  const existing = await db
    .select()
    .from(productExportsTable)
    .where(eq(productExportsTable.productId, product.id));
  const version = existing.length + 1;
  const [brand] = await db.select().from(brandKitTable);
  const cover = (product.coverConfig ?? {}) as Record<string, string>;
  const fileName = `${product.id}-v${version}.${format === "md" ? "md" : "pdf"}`;
  const filePath = path.join(EXPORT_DIR, fileName);
  let pageCount: number | null = null;
  let fileSizeBytes: number;
  if (format === "md") {
    const md = renderProductMarkdown({
      title: product.title,
      subtitle: product.subtitle,
      chapters,
    });
    fs.mkdirSync(EXPORT_DIR, { recursive: true });
    fs.writeFileSync(filePath, md, "utf8");
    fileSizeBytes = Buffer.byteLength(md);
  } else {
    const result = await renderProductPdf({
      title: product.title,
      subtitle: product.subtitle,
      cover: {
        title: cover["title"] ?? product.title,
        subtitle: cover["subtitle"] ?? product.subtitle ?? undefined,
        author: cover["author"] ?? brand?.defaultAuthor ?? undefined,
        primaryColor: cover["primaryColor"] ?? brand?.primaryColor,
        accentColor: cover["accentColor"] ?? brand?.accentColor,
      },
      chapters,
      pageSize,
      footerText: brand?.footerText,
      filePath,
    });
    pageCount = result.pageCount;
    fileSizeBytes = result.fileSizeBytes;
  }
  const [exp] = await db
    .insert(productExportsTable)
    .values({
      productId: product.id,
      createdById: req.user!.id,
      format,
      pageSize,
      theme: parsed.data.theme ?? "classic",
      version,
      status: "ready",
      filePath,
      pageCount,
      fileSizeBytes,
    })
    .returning();
  await audit({
    actorId: req.user!.id,
    actorName: req.user!.fullName,
    action: "product.exported",
    entityType: "product",
    entityId: product.id,
    detail: `Exported "${product.title}" as ${format.toUpperCase()} (v${version})`,
  });
  res
    .status(201)
    .json(ExportProductResponse.parse(serializeExport(exp, req.user!.fullName)));
});

router.get("/products/:productId/exports", async (req, res): Promise<void> => {
  const product = await loadOwnedProduct(
    req,
    res,
    String(req.params["productId"]),
  );
  if (!product) return;
  const rows = await db
    .select({ exp: productExportsTable, createdByName: usersTable.fullName })
    .from(productExportsTable)
    .leftJoin(usersTable, eq(usersTable.id, productExportsTable.createdById))
    .where(eq(productExportsTable.productId, product.id));
  rows.sort((a, b) => b.exp.version - a.exp.version);
  res.json(
    GetProductExportsResponse.parse(
      rows.map((r) => serializeExport(r.exp, r.createdByName)),
    ),
  );
});

router.get("/exports/:exportId/download", async (req, res): Promise<void> => {
  const [exp] = await db
    .select()
    .from(productExportsTable)
    .where(eq(productExportsTable.id, String(req.params["exportId"])));
  if (!exp || !exp.filePath || !fs.existsSync(exp.filePath)) {
    res.status(404).json({ error: "Export not found" });
    return;
  }
  const product = await loadOwnedProduct(req, res, exp.productId);
  if (!product) return;
  const safeTitle = product.title.replace(/[^\w\- ]+/g, "").trim() || "export";
  res.download(exp.filePath, `${safeTitle}-${exp.version}.${exp.format === "md" ? "md" : "pdf"}`);
});

export default router;
