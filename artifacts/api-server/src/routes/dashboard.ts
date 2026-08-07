import { Router, type IRouter } from "express";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  db,
  productsTable,
  productExportsTable,
  auditLogsTable,
  creditTransactionsTable,
  notificationsTable,
} from "@workspace/db";
import {
  GetDashboardStatsResponse,
  GetRecentActivityResponse,
  GetCreditTransactionsResponse,
  RequestCreditsBody,
  RequestCreditsResponse,
  GetNotificationsResponse,
  MarkNotificationReadResponse,
  MarkAllNotificationsReadResponse,
} from "@workspace/api-zod";
import { requireAuth, requireOnboarding } from "../middlewares/auth";
import { hasPermission } from "../lib/permissions";
import { notifyAdmins, iso } from "../lib/helpers";

const router: IRouter = Router();
router.use(requireAuth);

router.get(
  "/dashboard/stats",
  requireOnboarding,
  async (req, res): Promise<void> => {
    const user = req.user!;
    const seeAll = hasPermission(user.role, "canViewAllProducts");
    const ownerFilter = seeAll ? undefined : eq(productsTable.ownerId, user.id);
    const products = await db
      .select({ id: productsTable.id, status: productsTable.status })
      .from(productsTable)
      .where(ownerFilter);
    const productIds = products.map((p) => p.id);
    const [exportCount] = productIds.length
      ? await db
          .select({ count: sql<number>`count(*)::int` })
          .from(productExportsTable)
          .where(inArray(productExportsTable.productId, productIds))
      : [{ count: 0 }];
    res.json(
      GetDashboardStatsResponse.parse({
        productsCreated: products.filter((p) => p.status !== "archived").length,
        draftsInProgress: products.filter((p) =>
          ["draft", "generating", "changes_requested"].includes(p.status),
        ).length,
        awaitingReview: products.filter((p) => p.status === "in_review").length,
        approved: products.filter((p) => p.status === "approved").length,
        totalExports: exportCount?.count ?? 0,
        creditsRemaining: user.creditsBalance,
      }),
    );
  },
);

router.get(
  "/dashboard/activity",
  requireOnboarding,
  async (req, res): Promise<void> => {
    const user = req.user!;
    const seeAll = hasPermission(user.role, "canViewAllProducts");
    const rows = await db
      .select()
      .from(auditLogsTable)
      .where(seeAll ? undefined : eq(auditLogsTable.actorId, user.id))
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(15);
    res.json(
      GetRecentActivityResponse.parse(
        rows.map((r) => ({
          id: r.id,
          actorName: r.actorName,
          action: r.action,
          entityType: r.entityType,
          entityId: r.entityId,
          summary: r.detail,
          createdAt: r.createdAt.toISOString(),
        })),
      ),
    );
  },
);

router.get("/credits/transactions", async (req, res): Promise<void> => {
  const user = req.user!;
  const rows = await db
    .select()
    .from(creditTransactionsTable)
    .where(eq(creditTransactionsTable.userId, user.id))
    .orderBy(desc(creditTransactionsTable.createdAt))
    .limit(50);
  res.json(
    GetCreditTransactionsResponse.parse(
      rows.map((r) => ({
        id: r.id,
        delta: r.amount,
        reason: r.actionKey ?? r.kind,
        balanceAfter: r.balanceAfter,
        note: r.note,
        createdAt: r.createdAt.toISOString(),
      })),
    ),
  );
});

router.post("/credits/request", async (req, res): Promise<void> => {
  const parsed = RequestCreditsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = req.user!;
  await notifyAdmins({
    type: "credit_request",
    title: `${user.fullName} requested more credits`,
    body: parsed.data.note ?? `Current balance: ${user.creditsBalance}`,
    linkPath: "/admin/users",
  });
  res.json(RequestCreditsResponse.parse({ ok: true }));
});

router.get("/notifications", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, req.user!.id))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(30);
  res.json(
    GetNotificationsResponse.parse(
      rows.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        linkPath: n.linkPath,
        isRead: !!n.readAt,
        createdAt: n.createdAt.toISOString(),
      })),
    ),
  );
});

router.post(
  "/notifications/:notificationId/read",
  async (req, res): Promise<void> => {
    await db
      .update(notificationsTable)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(notificationsTable.id, String(req.params["notificationId"])),
          eq(notificationsTable.userId, req.user!.id),
        ),
      );
    res.json(MarkNotificationReadResponse.parse({ ok: true }));
  },
);

router.post("/notifications/read-all", async (req, res): Promise<void> => {
  await db
    .update(notificationsTable)
    .set({ readAt: new Date() })
    .where(eq(notificationsTable.userId, req.user!.id));
  res.json(MarkAllNotificationsReadResponse.parse({ ok: true }));
});

export { iso };
export default router;
