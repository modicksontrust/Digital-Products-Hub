import { Readable } from "stream";
import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, gt } from "drizzle-orm";
import {
  db,
  productsTable,
  productChaptersTable,
  salesCopyTable,
  previewTokensTable,
  bioSettingsTable,
  bioLinksTable,
} from "@workspace/db";
import { asc } from "drizzle-orm";
import {
  GetPublicSalesPageResponse,
  GetPublicBioResponse,
} from "@workspace/api-zod";
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

/**
 * Load a product by slug regardless of publish status, but only when
 * a valid, non-expired preview token is present in the request query.
 */
async function loadProductBySlugWithToken(slug: string, token: string) {
  const now = new Date();
  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.slug, slug));

  if (!product) return null;

  const [row] = await db
    .select()
    .from(previewTokensTable)
    .where(
      and(
        eq(previewTokensTable.productId, product.id),
        eq(previewTokensTable.token, token),
        gt(previewTokensTable.expiresAt, now),
      ),
    );

  return row ? product : null;
}

router.get(
  "/public/sales-page/:slug",
  async (req, res): Promise<void> => {
    const slug = String(req.params["slug"]);
    const previewToken = req.query["preview"] ? String(req.query["preview"]) : null;

    let product = null;
    if (previewToken) {
      product = await loadProductBySlugWithToken(slug, previewToken);
    } else {
      product = await loadPublishedProductByslug(slug);
    }

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

    // Pass the preview token through to the cover proxy URL so the cover
    // also loads for unpublished draft previews.
    const coverBase = `/public/sales-page/${slug}/cover`;
    const coverUrl = cover?.imageUrl
      ? previewToken
        ? `${coverBase}?preview=${previewToken}`
        : coverBase
      : null;

    res.json(
      GetPublicSalesPageResponse.parse({
        productId: product.id,
        title: product.title,
        subtitle: product.subtitle,
        authorName: product.authorName,
        // Cover images live behind the authed /storage/objects/* route, so
        // point anonymous visitors at this router's own passthrough instead.
        coverImageUrl: coverUrl,
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
    const previewToken = req.query["preview"] ? String(req.query["preview"]) : null;

    let product = null;
    if (previewToken) {
      product = await loadProductBySlugWithToken(slug, previewToken);
    } else {
      product = await loadPublishedProductByslug(slug);
    }

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

router.get("/public/bio/:slug", async (req, res): Promise<void> => {
  const slug = String(req.params["slug"]);
  const [settings] = await db
    .select()
    .from(bioSettingsTable)
    .where(eq(bioSettingsTable.slug, slug));

  if (!settings || !settings.published) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const links = await db
    .select()
    .from(bioLinksTable)
    .where(
      and(
        eq(bioLinksTable.userId, settings.userId),
        eq(bioLinksTable.active, true),
      ),
    )
    .orderBy(asc(bioLinksTable.sortOrder), asc(bioLinksTable.createdAt));

  let products: (typeof productsTable.$inferSelect)[] = [];
  if (settings.showProducts) {
    products = await db
      .select()
      .from(productsTable)
      .where(
        and(
          eq(productsTable.ownerId, settings.userId),
          eq(productsTable.published, true),
          eq(productsTable.showOnBio, true),
        ),
      );
  }

  res.json(
    GetPublicBioResponse.parse({
      displayName: settings.displayName,
      bio: settings.bio,
      avatarUrl: settings.avatarUrl ?? null,
      theme: settings.theme,
      socialLinks:
        (settings.socialLinks as { platform: string; url: string }[] | null) ??
        [],
      links: links.map((l) => ({ id: l.id, title: l.title, url: l.url })),
      products: products
        .filter((p) => p.slug)
        .map((p) => {
          const cover = (p.coverConfig ?? null) as { imageUrl?: string } | null;
          return {
            id: p.id,
            title: p.title,
            slug: p.slug,
            priceCents: p.priceCents,
            pricingMode: p.pricingMode,
            currency: p.currency,
            coverImageUrl: cover?.imageUrl
              ? `/public/sales-page/${p.slug}/cover`
              : null,
            saleShortDescription: p.saleShortDescription ?? null,
          };
        }),
    }),
  );
});

export default router;
