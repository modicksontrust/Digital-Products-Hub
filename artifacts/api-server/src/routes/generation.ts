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
  GenerateSubtopicSuggestionsBody,
  GenerateSubtopicSuggestionsResponse,
  GenerateAdCopyBody,
  GenerateAdCopyResponse,
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

router.post("/generate/subtopic-suggestions", async (req, res): Promise<void> => {
  const parsed = GenerateSubtopicSuggestionsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const nicheLabel = NICHE_LABELS[parsed.data.niche] ?? parsed.data.niche;
  // Exploratory / free — helps pick a starting point before any credits are spent.
  const subtopics = await aiJson<{ title: string; description: string }[]>(
    "You are a digital-product market researcher who tracks what self-published eBooks and lead magnets are currently selling well.",
    `Give me 8 distinct, well-known subtopics (sub-categories) within the broader "${nicheLabel}" niche for a self-published eBook or PDF guide business. Think of these as the major sections a bookstore would use to organize "${nicheLabel}" books — each one should be specific enough to have its own dedicated audience, but broad enough to contain many possible book topics inside it.

For each subtopic return an object with:
- "title": a short subtopic name (1-4 words)
- "description": one short sentence describing who this subtopic is for and why it matters

Respond as a JSON array of exactly 8 objects, no other text.`,
  );
  res.json(
    GenerateSubtopicSuggestionsResponse.parse({
      niche: parsed.data.niche,
      subtopics,
    }),
  );
});

router.post("/generate/niche-suggestions", async (req, res): Promise<void> => {
  const parsed = GenerateNicheSuggestionsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const nicheLabel = NICHE_LABELS[parsed.data.niche] ?? parsed.data.niche;
  const subtopic = parsed.data.subtopic?.trim();
  const scopeLabel = subtopic ? `"${subtopic}" (a subtopic within the broader "${nicheLabel}" niche)` : `"${nicheLabel}" niche`;
  // Exploratory / free — helps pick a starting point before any credits are spent.
  const subNiches = await aiJson<
    { title: string; hook: string; suggestedTopic: string; suggestedAudience: string; trending?: boolean; sellabilityScore: number }[]
  >(
    "You are a digital-product market researcher who tracks what self-published eBooks and lead magnets are currently selling well.",
    `Give me 8 of the most trending, hot, and most-searched-for sub-niches right now inside the ${scopeLabel} for a self-published eBook or PDF guide business.

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

router.post("/generate/book-details", async (req, res): Promise<void> => {
  const { bookTitle, topic, audience } = req.body as { bookTitle?: string; topic?: string; audience?: string };
  if (!bookTitle?.trim()) {
    res.status(400).json({ error: "bookTitle is required" });
    return;
  }
  const context = [
    topic ? `Topic/angle: ${topic}` : "",
    audience ? `Target audience: ${audience}` : "",
  ].filter(Boolean).join("\n");

  try {
    const result = await aiJson<{ painPoint: string; benefits: string[] }>(
      "You are a digital-product marketing strategist who writes compelling, specific ad copy for self-published eBooks.",
      `Given the following eBook, return a JSON object with exactly two fields:
- "painPoint": a single clear, specific sentence describing the main frustration or problem this book solves (written from the reader's perspective, present tense, vivid and relatable)
- "benefits": an array of exactly 5 concise benefit statements (each 5-10 words, outcome-focused, starts with a strong verb or result)

eBook title: "${bookTitle}"
${context}

Respond ONLY with valid JSON. No prose, no markdown fences.`,
      512,
    );
    res.json({ painPoint: result.painPoint ?? "", benefits: Array.isArray(result.benefits) ? result.benefits : [] });
  } catch {
    res.status(502).json({ error: "AI generation failed", painPoint: "", benefits: [] });
  }
});

router.post("/generate/ad-copy", async (req, res): Promise<void> => {
  const parsed = GenerateAdCopyBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { bookTitle, painPoint, audience, country, price, benefits, adType, platforms, objective } = parsed.data;

  const benefitsList = benefits?.length
    ? `Key benefits:\n${benefits.map((b, i) => `${i + 1}. ${b}`).join("\n")}`
    : "";
  const priceStr = price ? `Price: $${price}` : "";
  const platformStr = platforms.join(", ");
  const objectiveDescriptions: Record<string, string> = {
    traffic: "driving clicks to the sales page",
    engagement: "maximizing likes, comments, and shares",
    conversions: "optimizing for direct purchases",
  };
  const objectiveDesc = objectiveDescriptions[objective] ?? objective;
  const countryStr = country && country !== "Global" ? `Target market: ${country}` : "Target market: Global";

  const systemPrompt = `You are an expert digital-product ad copywriter who creates high-converting social media ad creatives for self-published eBooks. Your copy is punchy, benefit-driven, and tailored to the specified platforms and objectives.`;

  const needsAdCopy = adType === "ad_copy" || adType === "full_package";
  const needsImageAds = adType === "image_ads" || adType === "full_package";
  const needsVideoScripts = adType === "video_scripts" || adType === "full_package";

  const sections: string[] = [];
  if (needsAdCopy) {
    sections.push(`"adCopy": array of exactly 5 objects, each with:
  - "hook": a scroll-stopping opening line (1-2 sentences)
  - "body": the main ad body copy (2-4 sentences, benefit-focused)
  - "cta": a short call-to-action phrase`);
  }
  if (needsImageAds) {
    sections.push(`"imageAds": array of exactly 5 objects, each with:
  - "headline": bold headline for the image (5-10 words)
  - "subtext": supporting subtext below the headline (1-2 short sentences)
  - "visual": a concise description of the ideal visual/design concept for this ad`);
  }
  if (needsVideoScripts) {
    sections.push(`"videoScripts": array of exactly 3 objects, one each for: "Talking Head" (15s), "Story Format" (30s), "Listicle" (45s). Each with:
  - "title": the script type name (e.g. "Talking Head")
  - "type": duration (e.g. "15s")
  - "hook": the opening line/visual hook
  - "body": the main script body with scene directions in [brackets]
  - "cta": the closing call-to-action line`);
  }

  const prompt = `Create high-converting ${adType.replace("_", " ")} ad creatives for the following eBook:

Book title: "${bookTitle}"
Pain point this book solves: ${painPoint || "not specified"}
Target audience: ${audience || "general audience"}
${countryStr}
${priceStr}
${benefitsList}

Platforms: ${platformStr}
Campaign objective: ${objectiveDesc}

Return a JSON object with the following field(s):
${sections.join("\n")}

Write copy that:
- Speaks directly to the target audience's pain points and desires
- Uses proven ad copywriting formulas (AIDA, PAS, hook-story-offer, etc.)
- Varies hooks and angles significantly across variations
- Feels native to the specified platforms
- Drives the stated objective (${objectiveDesc})

Respond ONLY with valid JSON matching the schema above. No prose, no markdown fences.`;

  const charged = await chargeOr402(req, res, "ad_copy");
  if (charged === null) return;

  try {
    const result = await aiJson<Record<string, unknown>>(systemPrompt, prompt, 4096);
    res.json(GenerateAdCopyResponse.parse(result));
  } catch (err) {
    console.error("[ad-copy] AI generation error:", err);
    res.status(502).json({
      error: "The AI returned an unexpected response. Please try again.",
      code: "AI_GENERATION_FAILED",
    });
  }
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

router.post("/products/:productId/export", async (req, res): Promise<void> => {
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
        author: product.authorName ?? cover["author"] ?? brand?.defaultAuthor ?? undefined,
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
  const extension = exp.format === "md" ? "md" : "pdf";
  const fileName = `${safeTitle}-${exp.version}.${extension}`;
  // `?inline=1` renders the file in-browser (PDF preview) instead of forcing a download.
  if (req.query["inline"] === "1") {
    const mimeType = extension === "pdf" ? "application/pdf" : "text/markdown";
    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Disposition", `inline; filename="${fileName}"`);
    res.sendFile(exp.filePath);
    return;
  }
  res.download(exp.filePath, fileName);
});

export default router;
