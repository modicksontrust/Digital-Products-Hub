import { eq, asc } from "drizzle-orm";
import {
  db,
  generationJobsTable,
  productsTable,
  productChaptersTable,
  salesCopyTable,
  usersTable,
} from "@workspace/db";
import { aiJson, aiText } from "./ai";
import { logger } from "./logger";
import { notify } from "./helpers";
import { wordCount } from "./serialize";

type JobRow = typeof generationJobsTable.$inferSelect;

export function serializeJob(job: JobRow, creditsCharged = 0) {
  return {
    id: job.id,
    productId: job.productId,
    type: job.type,
    status: job.status as "queued" | "running" | "succeeded" | "failed",
    progressLabel: job.progressLabel,
    completedUnits: job.completedUnits,
    totalUnits: job.totalUnits,
    creditsCharged,
    errorMessage: job.errorMessage,
    chapterStatuses: (job.chapterStatuses ?? undefined) as
      | { chapterId: string; title: string | null; status: string }[]
      | undefined,
    createdAt: job.createdAt.toISOString(),
    finishedAt:
      job.status === "succeeded" || job.status === "failed"
        ? job.updatedAt.toISOString()
        : null,
  };
}

async function updateJob(
  jobId: string,
  patch: Partial<typeof generationJobsTable.$inferInsert>,
): Promise<void> {
  await db
    .update(generationJobsTable)
    .set(patch)
    .where(eq(generationJobsTable.id, jobId));
}

export async function createJob(input: {
  productId: string;
  userId: string;
  type: string;
  totalUnits?: number;
  progressLabel?: string;
}): Promise<JobRow> {
  const [job] = await db
    .insert(generationJobsTable)
    .values({
      productId: input.productId,
      userId: input.userId,
      type: input.type,
      status: "queued",
      totalUnits: input.totalUnits ?? 1,
      progressLabel: input.progressLabel ?? "Queued",
    })
    .returning();
  return job;
}

function productBrief(p: typeof productsTable.$inferSelect): string {
  return [
    `Title: ${p.title}`,
    p.subtitle ? `Subtitle: ${p.subtitle}` : "",
    `Topic: ${p.topic ?? p.title}`,
    p.audience ? `Audience: ${p.audience}` : "",
    p.tone ? `Tone: ${p.tone}` : "",
    `Language: ${p.language}`,
    `Depth: ${p.depth}`,
    p.region ? `Target region: ${p.region} (adapt cultural references, examples, and pricing mentions accordingly)` : "",
    p.lengthTier ? `Length tier: ${p.lengthTier}` : "",
    p.keyPoints ? `Key points to cover: ${p.keyPoints}` : "",
    p.ctaText ? `Call to action: ${p.ctaText}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** Fire-and-forget runner with logging. */
export function runInBackground(jobId: string, fn: () => Promise<void>): void {
  void (async () => {
    try {
      await updateJob(jobId, { status: "running" });
      await fn();
      await updateJob(jobId, { status: "succeeded", progressLabel: "Done" });
    } catch (err) {
      logger.error({ err, jobId }, "Generation job failed");
      await updateJob(jobId, {
        status: "failed",
        errorMessage: err instanceof Error ? err.message : "Generation failed",
      }).catch(() => undefined);
    }
  })();
}

export function runOutlineJob(jobId: string, productId: string): void {
  runInBackground(jobId, async () => {
    const [product] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, productId));
    if (!product) throw new Error("Product not found");
    await updateJob(jobId, { progressLabel: "Designing your outline" });
    const count = product.requestedChapterCount;
    const outline = await aiJson<{
      subtitle?: string;
      chapters: { title: string; summary: string }[];
    }>(
      "You are an expert non-fiction book architect for digital products.",
      `Create an outline for an eBook.\n${productBrief(product)}\n\nProduce exactly ${count} chapters. Return JSON: {"subtitle": string, "chapters": [{"title": string, "summary": string (2-3 sentences)}]}`,
    );
    await db
      .delete(productChaptersTable)
      .where(eq(productChaptersTable.productId, productId));
    let idx = 0;
    for (const ch of outline.chapters.slice(0, count + 2)) {
      await db.insert(productChaptersTable).values({
        productId,
        orderIndex: idx++,
        title: ch.title,
        summary: ch.summary,
        status: "pending",
      });
    }
    await db
      .update(productsTable)
      .set({
        status: "draft",
        subtitle: product.subtitle ?? outline.subtitle ?? null,
      })
      .where(eq(productsTable.id, productId));
    await updateJob(jobId, { completedUnits: 1 });
  });
}

const DEPTH_WORDS: Record<string, string> = {
  short: "600-900",
  standard: "1000-1500",
  deep: "1800-2500",
};

export function runChaptersJob(
  jobId: string,
  productId: string,
  chapterIds?: string[],
): void {
  runInBackground(jobId, async () => {
    const [product] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, productId));
    if (!product) throw new Error("Product not found");
    let chapters = await db
      .select()
      .from(productChaptersTable)
      .where(eq(productChaptersTable.productId, productId))
      .orderBy(asc(productChaptersTable.orderIndex));
    const all = chapters;
    if (chapterIds?.length) {
      chapters = chapters.filter((c) => chapterIds.includes(c.id));
    }
    const statuses = all.map((c) => ({
      chapterId: c.id,
      title: c.title,
      status: chapterIds?.length
        ? chapterIds.includes(c.id)
          ? "pending"
          : c.status
        : "pending",
    }));
    await updateJob(jobId, {
      totalUnits: chapters.length,
      chapterStatuses: statuses,
    });
    await db
      .update(productsTable)
      .set({ status: "generating" })
      .where(eq(productsTable.id, productId));

    const words = DEPTH_WORDS[product.depth] ?? DEPTH_WORDS["standard"];
    const toc = all.map((c, i) => `${i + 1}. ${c.title}`).join("\n");
    let done = 0;
    let anyFailed = false;
    for (const chapter of chapters) {
      const mark = (status: string) => {
        const entry = statuses.find((s) => s.chapterId === chapter.id);
        if (entry) entry.status = status;
      };
      mark("generating");
      await db
        .update(productChaptersTable)
        .set({ status: "generating" })
        .where(eq(productChaptersTable.id, chapter.id));
      await updateJob(jobId, {
        progressLabel: `Writing chapter ${done + 1} of ${chapters.length}: ${chapter.title}`,
        chapterStatuses: statuses,
        completedUnits: done,
      });
      try {
        const content = await aiText(
          "You are a professional non-fiction ghostwriter. Write in clean Markdown using ## and ### headings, short paragraphs, and occasional bullet lists. Never repeat the chapter title as a heading at the top.",
          `Write the full chapter content (${words} words) for this eBook chapter.\n\nBook brief:\n${productBrief(product)}\n\nFull table of contents:\n${toc}\n\nChapter to write: "${chapter.title}"\nChapter summary: ${chapter.summary ?? ""}\n\nWrite substantive, practical content. Do not include the book title.`,
        );
        await db
          .update(productChaptersTable)
          .set({ contentMd: content, status: "ready" })
          .where(eq(productChaptersTable.id, chapter.id));
        mark("ready");
      } catch (err) {
        logger.error({ err, chapterId: chapter.id }, "Chapter failed");
        anyFailed = true;
        await db
          .update(productChaptersTable)
          .set({ status: "failed" })
          .where(eq(productChaptersTable.id, chapter.id));
        mark("failed");
      }
      done += 1;
      await updateJob(jobId, { completedUnits: done, chapterStatuses: statuses });
    }
    await db
      .update(productsTable)
      .set({ status: "ready" })
      .where(eq(productsTable.id, productId));
    if (anyFailed) throw new Error("Some chapters failed to generate");
    const [owner] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, product.ownerId));
    if (owner) {
      await notify({
        userId: owner.id,
        type: "generation",
        title: `"${product.title}" finished generating`,
        body: "All chapters are ready to edit.",
        linkPath: `/create/ebook?productId=${product.id}`,
      });
    }
  });
}

const REWRITE_INSTRUCTIONS: Record<string, string> = {
  regenerate: "Rewrite this chapter from scratch with fresh structure and examples.",
  expand: "Expand this chapter by roughly 50%, adding depth, examples, and detail.",
  shorten: "Tighten this chapter to roughly 60% of its length while keeping all key ideas.",
  change_tone: "Rewrite this chapter in the requested tone.",
  add_examples: "Keep the structure but weave in 2-3 concrete, realistic examples or mini case studies.",
};

export function runRewriteJob(
  jobId: string,
  productId: string,
  chapterId: string,
  instruction: string,
  tone?: string,
): void {
  runInBackground(jobId, async () => {
    const [product] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, productId));
    const [chapter] = await db
      .select()
      .from(productChaptersTable)
      .where(eq(productChaptersTable.id, chapterId));
    if (!product || !chapter) throw new Error("Chapter not found");
    await updateJob(jobId, { progressLabel: `Rewriting "${chapter.title}"` });
    const content = await aiText(
      "You are a professional non-fiction editor and ghostwriter. Output clean Markdown only.",
      `${REWRITE_INSTRUCTIONS[instruction] ?? REWRITE_INSTRUCTIONS["regenerate"]}${tone ? ` Target tone: ${tone}.` : ""}\n\nBook brief:\n${productBrief(product)}\n\nChapter title: "${chapter.title}"\n\nCurrent content:\n${chapter.contentMd ?? chapter.summary ?? "(empty — write it fresh)"}`,
    );
    await db
      .update(productChaptersTable)
      .set({ contentMd: content, status: "ready" })
      .where(eq(productChaptersTable.id, chapterId));
    await updateJob(jobId, { completedUnits: 1 });
  });
}

export function runSalesCopyJob(jobId: string, productId: string): void {
  runInBackground(jobId, async () => {
    const [product] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, productId));
    if (!product) throw new Error("Product not found");
    const chapters = await db
      .select()
      .from(productChaptersTable)
      .where(eq(productChaptersTable.productId, productId))
      .orderBy(asc(productChaptersTable.orderIndex));
    await updateJob(jobId, { progressLabel: "Writing sales copy" });
    const copy = await aiJson<{
      headline: string;
      subheadline: string;
      bullets: string[];
      whoItsFor: string;
      faq: { question: string; answer: string }[];
      ctaText: string;
      suggestedPriceBand: string;
    }>(
      "You are a direct-response copywriter for digital products.",
      `Write a sales page draft for this product.\n${productBrief(product)}\nTable of contents:\n${chapters.map((c) => c.title).join("\n")}\n\nReturn JSON: {"headline", "subheadline", "bullets": [6 benefit bullets], "whoItsFor": paragraph, "faq": [4 {"question","answer"}], "ctaText", "suggestedPriceBand": e.g. "$17-$27"}`,
    );
    await db
      .insert(salesCopyTable)
      .values({
        productId,
        headline: copy.headline,
        subheadline: copy.subheadline,
        bullets: copy.bullets,
        whoItsFor: copy.whoItsFor,
        faq: copy.faq,
        ctaText: copy.ctaText,
        suggestedPriceBand: copy.suggestedPriceBand,
      })
      .onConflictDoUpdate({
        target: salesCopyTable.productId,
        set: {
          headline: copy.headline,
          subheadline: copy.subheadline,
          bullets: copy.bullets,
          whoItsFor: copy.whoItsFor,
          faq: copy.faq,
          ctaText: copy.ctaText,
          suggestedPriceBand: copy.suggestedPriceBand,
        },
      });
    await updateJob(jobId, { completedUnits: 1 });
  });
}

export function runLeadMagnetJob(jobId: string, productId: string): void {
  runInBackground(jobId, async () => {
    const [product] = await db
      .select()
      .from(productsTable)
      .where(eq(productsTable.id, productId));
    if (!product) throw new Error("Product not found");
    await updateJob(jobId, { progressLabel: "Creating your lead magnet" });
    await db
      .update(productsTable)
      .set({ status: "generating" })
      .where(eq(productsTable.id, productId));
    const format = product.leadMagnetFormat ?? "one-page guide";
    const result = await aiJson<{
      subtitle: string;
      sections: { title: string; contentMd: string }[];
    }>(
      "You create concise, high-value lead magnets (checklists, cheat sheets, worksheets, swipe files, one-page guides). Output tight, scannable Markdown.",
      `Create a ${format} lead magnet.\n${productBrief(product)}\n\nReturn JSON: {"subtitle": string, "sections": [2-5 {"title", "contentMd"}]} — total length suitable for 1-4 pages.`,
    );
    await db
      .delete(productChaptersTable)
      .where(eq(productChaptersTable.productId, productId));
    let idx = 0;
    for (const s of result.sections) {
      await db.insert(productChaptersTable).values({
        productId,
        orderIndex: idx++,
        title: s.title,
        contentMd: s.contentMd,
        status: "ready",
      });
    }
    await db
      .update(productsTable)
      .set({
        status: "ready",
        subtitle: product.subtitle ?? result.subtitle ?? null,
      })
      .where(eq(productsTable.id, productId));
    await updateJob(jobId, { completedUnits: 1 });
  });
}

export { wordCount };
