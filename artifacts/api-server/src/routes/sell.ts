import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, discountCodesTable } from "@workspace/db";
import {
  CreateDiscountCodeBody,
  UpdateDiscountCodeBody,
  GetDiscountCodesResponse,
  CreateDiscountCodeResponse,
  UpdateDiscountCodeResponse,
} from "@workspace/api-zod";
import { requireAuth, requireOnboarding } from "../middlewares/auth";
import { iso } from "../lib/helpers";

const router: IRouter = Router();
router.use(requireAuth, requireOnboarding);

function serializeCode(c: typeof discountCodesTable.$inferSelect) {
  return {
    id: c.id,
    ownerId: c.ownerId,
    productId: c.productId ?? null,
    code: c.code,
    discountType: c.discountType,
    discountValue: c.discountValue,
    maxUses: c.maxUses ?? null,
    useCount: c.useCount,
    active: c.active,
    expiresAt: iso(c.expiresAt),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  };
}

router.get("/sell/discounts", async (req, res): Promise<void> => {
  const user = req.user!;
  const rows = await db
    .select()
    .from(discountCodesTable)
    .where(eq(discountCodesTable.ownerId, user.id))
    .orderBy(desc(discountCodesTable.createdAt));
  res.json(GetDiscountCodesResponse.parse(rows.map(serializeCode)));
});

router.post("/sell/discounts", async (req, res): Promise<void> => {
  const parsed = CreateDiscountCodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = req.user!;
  const d = parsed.data;
  const [code] = await db
    .insert(discountCodesTable)
    .values({
      ownerId: user.id,
      productId: d.productId ?? null,
      code: d.code.toUpperCase().trim(),
      discountType: d.discountType,
      discountValue: d.discountValue,
      maxUses: d.maxUses ?? null,
      expiresAt: d.expiresAt ? new Date(d.expiresAt) : null,
    })
    .returning();
  res.status(201).json(CreateDiscountCodeResponse.parse(serializeCode(code)));
});

router.patch("/sell/discounts/:id", async (req, res): Promise<void> => {
  const user = req.user!;
  const id = String(req.params["id"]);
  const [existing] = await db
    .select()
    .from(discountCodesTable)
    .where(and(eq(discountCodesTable.id, id), eq(discountCodesTable.ownerId, user.id)));
  if (!existing) {
    res.status(404).json({ error: "Discount code not found" });
    return;
  }
  const parsed = UpdateDiscountCodeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const d = parsed.data;
  const [updated] = await db
    .update(discountCodesTable)
    .set({
      ...(d.active !== undefined ? { active: d.active } : {}),
      ...(d.maxUses !== undefined ? { maxUses: d.maxUses } : {}),
      ...(d.expiresAt !== undefined ? { expiresAt: d.expiresAt ? new Date(d.expiresAt) : null } : {}),
    })
    .where(eq(discountCodesTable.id, id))
    .returning();
  res.json(UpdateDiscountCodeResponse.parse(serializeCode(updated)));
});

router.delete("/sell/discounts/:id", async (req, res): Promise<void> => {
  const user = req.user!;
  const id = String(req.params["id"]);
  const [existing] = await db
    .select()
    .from(discountCodesTable)
    .where(and(eq(discountCodesTable.id, id), eq(discountCodesTable.ownerId, user.id)));
  if (!existing) {
    res.status(404).json({ error: "Discount code not found" });
    return;
  }
  await db.delete(discountCodesTable).where(eq(discountCodesTable.id, id));
  res.json({ ok: true });
});

export default router;
