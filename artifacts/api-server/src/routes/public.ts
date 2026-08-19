import { Readable } from "stream";
import { Router, type IRouter, type Request, type Response } from "express";
import { eq, and, gt } from "drizzle-orm";
import {
  db,
  productsTable,
  productChaptersTable,
  salesCopyTable,
  previewTokensTable,
  bioAnalyticsEventsTable,
  bioSettingsTable,
  bioLinksTable,
  bioAvatarUploadsTable,
} from "@workspace/db";
import { asc } from "drizzle-orm";
import {
  GetPublicSalesPageResponse,
  GetPublicBioResponse,
  PublicBioLinkClickParams,
} from "@workspace/api-zod";
import { ObjectNotFoundError, ObjectStorageService } from "../lib/objectStorage";
import { verifyAvatarImage } from "../lib/avatarImage";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

function uploadedObjectPath(value: string): string | null {
  const normalizedPath = value.replace(/^\/api\/storage/, "");
  return /^\/objects\/uploads\/[^/?#\s]+$/.test(normalizedPath)
    ? normalizedPath
    : null;
}

async function recordBioAnalyticsEvent(
  req: Request,
  event: {
    userId: string;
    eventType: "page_view" | "link_click";
    bioLinkId?: string;
  },
): Promise<void> {
  try {
    await db.insert(bioAnalyticsEventsTable).values(event);
  } catch (error) {
    // Analytics must never make a published creator page unavailable.
    req.log.error(
      { err: error, eventType: event.eventType },
      "Failed to record bio analytics event",
    );
  }
}

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
      const normalizedPath = uploadedObjectPath(cover.imageUrl);
      if (!normalizedPath) {
        res.status(404).json({ error: "Cover not found" });
        return;
      }
      const objectFile = await objectStorageService.getObjectEntityFile(
        normalizedPath,
      );
      const response = await objectStorageService.downloadObject(objectFile);
      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));
      if (response.body) {
        Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res);
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

router.get(
  "/public/bio/:slug/avatar",
  async (req: Request, res: Response): Promise<void> => {
    const slug = String(req.params["slug"]);
    const [settings] = await db
      .select()
      .from(bioSettingsTable)
      .where(eq(bioSettingsTable.slug, slug));
    const avatarPath =
      settings?.published && settings.avatarUrl
        ? uploadedObjectPath(settings.avatarUrl)
        : null;
    if (!avatarPath) {
      res.status(404).json({ error: "Avatar not found" });
      return;
    }

    const [avatarUpload] = await db
      .select({ id: bioAvatarUploadsTable.id })
      .from(bioAvatarUploadsTable)
      .where(
        and(
          eq(bioAvatarUploadsTable.userId, settings.userId),
          eq(bioAvatarUploadsTable.objectPath, avatarPath),
        ),
      );
    if (!avatarUpload) {
      res.status(404).json({ error: "Avatar not found" });
      return;
    }

    try {
      const objectFile = await objectStorageService.getObjectEntityFile(avatarPath);
      const verifiedImage = await verifyAvatarImage(
        await objectStorageService.downloadObject(objectFile),
      );
      if (!verifiedImage) {
        res.status(404).json({ error: "Avatar not found" });
        return;
      }
      res
        .status(200)
        .setHeader("Content-Type", verifiedImage.contentType);
      res.setHeader("Content-Length", String(verifiedImage.buffer.byteLength));
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.end(verifiedImage.buffer);
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        res.status(404).json({ error: "Avatar not found" });
        return;
      }
      req.log.error({ err: error }, "Error serving public bio avatar");
      res.status(500).json({ error: "Failed to serve avatar" });
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

  let avatarUrl = settings.avatarUrl ?? null;
  const avatarPath = avatarUrl ? uploadedObjectPath(avatarUrl) : null;
  if (avatarPath) {
    const [avatarUpload] = await db
      .select({ id: bioAvatarUploadsTable.id })
      .from(bioAvatarUploadsTable)
      .where(
        and(
          eq(bioAvatarUploadsTable.userId, settings.userId),
          eq(bioAvatarUploadsTable.objectPath, avatarPath),
        ),
      );
    avatarUrl = avatarUpload ? `/public/bio/${slug}/avatar` : null;
  }

  await recordBioAnalyticsEvent(req, {
    userId: settings.userId,
    eventType: "page_view",
  });

  res.json(
    GetPublicBioResponse.parse({
      displayName: settings.displayName,
      bio: settings.bio,
      avatarUrl,
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

router.post(
  "/public/bio/:slug/links/:linkId/click",
  async (req, res): Promise<void> => {
    const params = PublicBioLinkClickParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid bio link" });
      return;
    }

    const [settings] = await db
      .select()
      .from(bioSettingsTable)
      .where(eq(bioSettingsTable.slug, params.data.slug));

    if (!settings || !settings.published) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    const [link] = await db
      .select({ id: bioLinksTable.id })
      .from(bioLinksTable)
      .where(
        and(
          eq(bioLinksTable.id, params.data.linkId),
          eq(bioLinksTable.userId, settings.userId),
          eq(bioLinksTable.active, true),
        ),
      );
    if (!link) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    await recordBioAnalyticsEvent(req, {
      userId: settings.userId,
      bioLinkId: link.id,
      eventType: "link_click",
    });
    res.sendStatus(204);
  },
);

export default router;
