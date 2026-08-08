import { Readable } from "stream";
import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import {
  db,
  productsTable,
  productChaptersTable,
  salesCopyTable,
} from "@workspace/db";
import { GetPublicSalesPageResponse } from "@workspace/api-zod";
import { ObjectNotFoundError, ObjectStorageService } from "../lib/objectStorage";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

async function loadPublishedProductByslug(slug: string) {
  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.slug, slug));
  return product && product.published ? product : null;
}

router.get(
  "/public/sales-page/:slug",
  async (req, res): Promise<void> => {
    const slug = String(req.params["slug"]);
    const product = await loadPublishedProductByslug(slug);
    if (!product) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    const chapters = await db
      .select({ id: productChaptersTable.id })
      .from(productChaptersTable)
      .where(eq(productChaptersTable.productId, product.id));
    const [copy] = await db
      .select()
      .from(salesCopyTable)
      .where(eq(salesCopyTable.productId, product.id));
    const cover = (product.coverConfig ?? null) as { imageUrl?: string } | null;

    res.json(
      GetPublicSalesPageResponse.parse({
        productId: product.id,
        title: product.title,
        subtitle: product.subtitle,
        authorName: product.authorName,
        // Cover images live behind the authed /storage/objects/* route, so
        // point anonymous visitors at this router's own passthrough instead.
        coverImageUrl: cover?.imageUrl ? `/public/sales-page/${slug}/cover` : null,
        priceCents: product.priceCents,
        chapterCount: chapters.length,
        salesCopy: {
          productId: product.id,
          headline: copy?.headline ?? null,
          subheadline: copy?.subheadline ?? null,
          bullets: (copy?.bullets as string[] | null) ?? [],
          whoItsFor: copy?.whoItsFor ?? null,
          faq: (copy?.faq as { question: string; answer: string }[] | null) ?? [],
          ctaText: copy?.ctaText ?? null,
          suggestedPriceBand: copy?.suggestedPriceBand ?? null,
          updatedAt: copy?.updatedAt?.toISOString() ?? null,
        },
      }),
    );
  },
);

router.get(
  "/public/sales-page/:slug/cover",
  async (req: Request, res: Response): Promise<void> => {
    const slug = String(req.params["slug"]);
    const product = await loadPublishedProductByslug(slug);
    const cover = (product?.coverConfig ?? null) as { imageUrl?: string } | null;
    if (!product || !cover?.imageUrl) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    try {
      // coverConfig.imageUrl is stored either as "/objects/uploads/..." or
      // "/api/storage/objects/uploads/..." (client-facing form); normalize to
      // the "/objects/..." form getObjectEntityFile expects.
      const normalizedPath = cover.imageUrl.replace(/^\/api\/storage/, "");
      const objectFile = await objectStorageService.getObjectEntityFile(
        normalizedPath,
      );
      const response = await objectStorageService.downloadObject(objectFile);
      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));
      if (response.body) {
        Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(
          res,
        );
      } else {
        res.end();
      }
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        res.status(404).json({ error: "Cover not found" });
        return;
      }
      req.log.error({ err: error }, "Error serving public cover");
      res.status(500).json({ error: "Failed to serve cover" });
    }
  },
);

export default router;
