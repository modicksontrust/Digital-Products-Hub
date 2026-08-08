import { Router, type IRouter, type Request } from "express";
import { desc, eq } from "drizzle-orm";
import {
  db,
  productsTable,
  productCoversTable,
  usersTable,
  type Product,
  type ProductCover,
} from "@workspace/db";
import {
  GenerateProductCoverBody,
  GenerateProductCoverResponse,
  RegisterUploadedCoverBody,
  RegisterUploadedCoverResponse,
  GetProductCoversResponse,
  SelectProductCoverResponse,
} from "@workspace/api-zod";
import { requireAuth, requireOnboarding } from "../middlewares/auth";
import { hasPermission } from "../lib/permissions";
import { serializeProduct } from "../lib/serialize";
import { ObjectStorageService } from "../lib/objectStorage";
import { getCoverStyle } from "../lib/coverStyles";
import { generateImage } from "@workspace/integrations-gemini-ai/image";

const objectStorageService = new ObjectStorageService();

const router: IRouter = Router();
router.use(requireAuth, requireOnboarding);

function serializeCover(cover: ProductCover) {
  return {
    id: cover.id,
    productId: cover.productId,
    styleKey: cover.styleKey,
    styleLabel: cover.styleLabel,
    imageUrl: `/api/storage${cover.imagePath}`,
    source: cover.source as "ai" | "uploaded",
    createdAt: cover.createdAt.toISOString(),
  };
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
    return null;
  }
  return product;
}

async function ownerName(ownerId: string): Promise<string> {
  const [u] = await db
    .select({ fullName: usersTable.fullName })
    .from(usersTable)
    .where(eq(usersTable.id, ownerId));
  return u?.fullName ?? "Unknown";
}

router.get(
  "/products/:productId/covers",
  async (req, res): Promise<void> => {
    const product = await loadAccessible(req, String(req.params["productId"]));
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    const rows = await db
      .select()
      .from(productCoversTable)
      .where(eq(productCoversTable.productId, product.id))
      .orderBy(desc(productCoversTable.createdAt));
    res.json(GetProductCoversResponse.parse(rows.map(serializeCover)));
  },
);

router.post(
  "/products/:productId/covers/generate",
  async (req, res): Promise<void> => {
    const product = await loadAccessible(req, String(req.params["productId"]));
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    const parsed = GenerateProductCoverBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { styleKey, styleLabel } = parsed.data;
    const style = getCoverStyle(styleKey);
    if (!style) {
      res.status(400).json({ error: "Unknown cover style" });
      return;
    }

    let imagePath: string;
    try {
      const prompt = style.prompt({
        title: product.title,
        subtitle: product.subtitle,
        topic: product.topic,
        authorName: product.authorName,
      });
      // A4-proportioned (3:4 is the closest supported aspect ratio to A4's
      // 210:297 / ~0.707) so exported/print covers match the A4 page size.
      const { b64_json, mimeType } = await generateImage(prompt, { aspectRatio: "3:4" });
      const buffer = Buffer.from(b64_json, "base64");
      imagePath = await objectStorageService.saveBuffer(buffer, mimeType);
    } catch (error) {
      req.log.error({ err: error }, "Cover generation failed");
      res.status(502).json({ error: "Cover generation failed. Please try again." });
      return;
    }

    const [cover] = await db
      .insert(productCoversTable)
      .values({
        productId: product.id,
        styleKey,
        styleLabel,
        imagePath,
        source: "ai",
      })
      .returning();

    await db
      .update(productsTable)
      .set({ coverConfig: { coverId: cover.id, imageUrl: `/api/storage${cover.imagePath}`, styleKey } })
      .where(eq(productsTable.id, product.id));

    res.status(201).json(GenerateProductCoverResponse.parse(serializeCover(cover)));
  },
);

router.post(
  "/products/:productId/covers/upload",
  async (req, res): Promise<void> => {
    const product = await loadAccessible(req, String(req.params["productId"]));
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    const parsed = RegisterUploadedCoverBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const { objectPath } = parsed.data;

    const [cover] = await db
      .insert(productCoversTable)
      .values({
        productId: product.id,
        styleKey: "uploaded",
        styleLabel: "Your upload",
        imagePath: objectPath,
        source: "uploaded",
      })
      .returning();

    await db
      .update(productsTable)
      .set({ coverConfig: { coverId: cover.id, imageUrl: `/api/storage${cover.imagePath}`, styleKey: "uploaded" } })
      .where(eq(productsTable.id, product.id));

    res.status(201).json(RegisterUploadedCoverResponse.parse(serializeCover(cover)));
  },
);

router.post(
  "/products/:productId/covers/:coverId/select",
  async (req, res): Promise<void> => {
    const product = await loadAccessible(req, String(req.params["productId"]));
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }
    const [cover] = await db
      .select()
      .from(productCoversTable)
      .where(eq(productCoversTable.id, String(req.params["coverId"])));
    if (!cover || cover.productId !== product.id) {
      res.status(404).json({ error: "Cover not found" });
      return;
    }
    const [updated] = await db
      .update(productsTable)
      .set({ coverConfig: { coverId: cover.id, imageUrl: `/api/storage${cover.imagePath}`, styleKey: cover.styleKey } })
      .where(eq(productsTable.id, product.id))
      .returning();

    res.json(
      SelectProductCoverResponse.parse(
        await serializeProduct(updated, await ownerName(updated.ownerId)),
      ),
    );
  },
);

export default router;
