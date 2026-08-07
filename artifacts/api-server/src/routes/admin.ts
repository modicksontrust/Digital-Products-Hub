import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import { and, asc, desc, eq, lt, sql } from "drizzle-orm";
import {
  db,
  usersTable,
  invitationsTable,
  accessRequestsTable,
  learnModulesTable,
  lessonsTable,
  lessonProgressTable,
  creditCostsTable,
  creditTransactionsTable,
  auditLogsTable,
  brandKitTable,
} from "@workspace/db";
import {
  GetUsersResponse,
  UpdateUserBody,
  UpdateUserResponse,
  GrantCreditsBody,
  GrantCreditsResponse,
  GetInvitationsResponse,
  CreateInvitationBody,
  CreateInvitationResponse,
  RevokeInvitationResponse,
  GetAccessRequestsResponse,
  UpdateAccessRequestBody,
  UpdateAccessRequestResponse,
  CreateModuleBody,
  CreateModuleResponse,
  UpdateModuleBody,
  UpdateModuleResponse,
  DeleteModuleResponse,
  CreateLessonBody,
  CreateLessonResponse,
  UpdateLessonBody,
  UpdateLessonResponse,
  DeleteLessonResponse,
  GetOnboardingReportResponse,
  GetCreditCostsResponse,
  UpdateCreditCostsBody,
  UpdateCreditCostsResponse,
  GetCreditReportResponse,
  GetBrandKitResponse,
  UpdateBrandKitBody,
  UpdateBrandKitResponse,
  GetSettingsResponse,
  UpdateSettingsBody,
  UpdateSettingsResponse,
  GetAuditLogsQueryParams,
  GetAuditLogsResponse,
} from "@workspace/api-zod";
import { requireAuth, requirePermission } from "../middlewares/auth";
import {
  grantCredits,
  audit,
  iso,
  getSettings,
  setSetting,
  notify,
} from "../lib/helpers";
import { serializeLesson } from "../lib/serialize";

const router: IRouter = Router();
router.use(requireAuth);

function serializeAdminUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    status: u.status as "invited" | "active" | "suspended" | "deactivated",
    creditsBalance: u.creditsBalance,
    onboardingComplete: u.onboardingComplete,
    onboardingExempt: u.onboardingExempt,
    lastLoginAt: iso(u.lastLoginAt),
    createdAt: u.createdAt.toISOString(),
  };
}

// ---- Users ----

router.get(
  "/admin/users",
  requirePermission("canManageUsers"),
  async (_req, res): Promise<void> => {
    const rows = await db
      .select()
      .from(usersTable)
      .orderBy(asc(usersTable.createdAt));
    res.json(GetUsersResponse.parse(rows.map(serializeAdminUser)));
  },
);

router.patch(
  "/admin/users/:userId",
  requirePermission("canManageUsers"),
  async (req, res): Promise<void> => {
    const parsed = UpdateUserBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const userId = String(req.params["userId"]);
    const patch: Partial<typeof usersTable.$inferInsert> = {};
    if (parsed.data.role) patch.role = parsed.data.role;
    if (parsed.data.status) patch.status = parsed.data.status;
    if (parsed.data.onboardingExempt !== undefined)
      patch.onboardingExempt = parsed.data.onboardingExempt;
    if (parsed.data.resetOnboarding) patch.onboardingComplete = false;
    const [updated] = await db
      .update(usersTable)
      .set(patch)
      .where(eq(usersTable.id, userId))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (parsed.data.resetOnboarding) {
      await db
        .delete(lessonProgressTable)
        .where(eq(lessonProgressTable.userId, userId));
    }
    await audit({
      actorId: req.user!.id,
      actorName: req.user!.fullName,
      action: "admin.user_updated",
      entityType: "user",
      entityId: userId,
      detail: `Updated ${updated.fullName}`,
    });
    res.json(UpdateUserResponse.parse(serializeAdminUser(updated)));
  },
);

router.post(
  "/admin/users/:userId/credits",
  requirePermission("canGrantCredits"),
  async (req, res): Promise<void> => {
    const parsed = GrantCreditsBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const userId = String(req.params["userId"]);
    const updated = await grantCredits({
      userId,
      amount: parsed.data.amount,
      actorId: req.user!.id,
      note: parsed.data.note,
    });
    await notify({
      userId,
      type: "credits",
      title: `You received ${parsed.data.amount} credits`,
      body: parsed.data.note ?? undefined,
      linkPath: "/dashboard",
    });
    await audit({
      actorId: req.user!.id,
      actorName: req.user!.fullName,
      action: "admin.credits_granted",
      entityType: "user",
      entityId: userId,
      detail: `Granted ${parsed.data.amount} credits to ${updated.fullName}`,
    });
    res.json(GrantCreditsResponse.parse(serializeAdminUser(updated)));
  },
);

// ---- Invitations ----

router.get(
  "/admin/invitations",
  requirePermission("canManageUsers"),
  async (_req, res): Promise<void> => {
    const rows = await db
      .select({ invite: invitationsTable, invitedByName: usersTable.fullName })
      .from(invitationsTable)
      .leftJoin(usersTable, eq(usersTable.id, invitationsTable.invitedById))
      .orderBy(desc(invitationsTable.createdAt));
    res.json(
      GetInvitationsResponse.parse(
        rows.map((r) => ({
          id: r.invite.id,
          email: r.invite.email,
          role: r.invite.role,
          status:
            r.invite.status === "pending" && r.invite.expiresAt < new Date()
              ? "expired"
              : r.invite.status,
          acceptUrl:
            r.invite.status === "pending"
              ? `/invite/${r.invite.token}`
              : null,
          expiresAt: r.invite.expiresAt.toISOString(),
          invitedByName: r.invitedByName,
          createdAt: r.invite.createdAt.toISOString(),
        })),
      ),
    );
  },
);

router.post(
  "/admin/invitations",
  requirePermission("canManageUsers"),
  async (req, res): Promise<void> => {
    const parsed = CreateInvitationBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const email = parsed.data.email.toLowerCase().trim();
    const [existingUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));
    if (existingUser) {
      res.status(400).json({ error: "A user with this email already exists" });
      return;
    }
    const token = crypto.randomBytes(18).toString("hex");
    const [invite] = await db
      .insert(invitationsTable)
      .values({
        email,
        role: parsed.data.role,
        token,
        initialCredits: 25,
        invitedById: req.user!.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
      })
      .returning();
    await audit({
      actorId: req.user!.id,
      actorName: req.user!.fullName,
      action: "admin.invitation_created",
      entityType: "invitation",
      entityId: invite.id,
      detail: `Invited ${email} as ${parsed.data.role}`,
    });
    res.status(201).json(
      CreateInvitationResponse.parse({
        id: invite.id,
        email: invite.email,
        role: invite.role,
        status: "pending",
        acceptUrl: `/invite/${token}`,
        expiresAt: invite.expiresAt.toISOString(),
        invitedByName: req.user!.fullName,
        createdAt: invite.createdAt.toISOString(),
      }),
    );
  },
);

router.delete(
  "/admin/invitations/:invitationId",
  requirePermission("canManageUsers"),
  async (req, res): Promise<void> => {
    const [updated] = await db
      .update(invitationsTable)
      .set({ status: "revoked" })
      .where(eq(invitationsTable.id, String(req.params["invitationId"])))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Invitation not found" });
      return;
    }
    res.json(RevokeInvitationResponse.parse({ ok: true }));
  },
);

// ---- Access requests ----

router.get(
  "/admin/access-requests",
  requirePermission("canManageUsers"),
  async (_req, res): Promise<void> => {
    const rows = await db
      .select()
      .from(accessRequestsTable)
      .orderBy(desc(accessRequestsTable.createdAt));
    res.json(
      GetAccessRequestsResponse.parse(
        rows.map((r) => ({
          id: r.id,
          name: r.fullName,
          email: r.email,
          requestedRole: null,
          message: r.reason,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
        })),
      ),
    );
  },
);

router.patch(
  "/admin/access-requests/:requestId",
  requirePermission("canManageUsers"),
  async (req, res): Promise<void> => {
    const parsed = UpdateAccessRequestBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [updated] = await db
      .update(accessRequestsTable)
      .set({ status: parsed.data.status })
      .where(eq(accessRequestsTable.id, String(req.params["requestId"])))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Request not found" });
      return;
    }
    res.json(
      UpdateAccessRequestResponse.parse({
        id: updated.id,
        name: updated.fullName,
        email: updated.email,
        requestedRole: null,
        message: updated.reason,
        status: updated.status,
        createdAt: updated.createdAt.toISOString(),
      }),
    );
  },
);

// ---- Curriculum ----

async function serializeModule(
  m: typeof learnModulesTable.$inferSelect,
  userId: string,
) {
  const lessons = await db
    .select()
    .from(lessonsTable)
    .where(eq(lessonsTable.moduleId, m.id))
    .orderBy(asc(lessonsTable.orderIndex));
  const out = [];
  for (const l of lessons) out.push(await serializeLesson(l, userId));
  return {
    id: m.id,
    title: m.title,
    description: m.description,
    stage: m.stage,
    orderIndex: m.orderIndex,
    isPublished: m.isPublished,
    lessons: out,
  };
}

router.get(
  "/admin/modules",
  requirePermission("canManageLearn"),
  async (req, res): Promise<void> => {
    const modules = await db
      .select()
      .from(learnModulesTable)
      .orderBy(asc(learnModulesTable.orderIndex));
    const out = [];
    for (const m of modules) out.push(await serializeModule(m, req.user!.id));
    res.json(out);
  },
);

router.post(
  "/admin/modules",
  requirePermission("canManageLearn"),
  async (req, res): Promise<void> => {
    const parsed = CreateModuleBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [m] = await db
      .insert(learnModulesTable)
      .values({
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        stage: parsed.data.stage ?? "create",
        orderIndex: parsed.data.orderIndex ?? 0,
        isPublished: parsed.data.isPublished ?? true,
      })
      .returning();
    res
      .status(201)
      .json(CreateModuleResponse.parse(await serializeModule(m, req.user!.id)));
  },
);

router.patch(
  "/admin/modules/:moduleId",
  requirePermission("canManageLearn"),
  async (req, res): Promise<void> => {
    const parsed = UpdateModuleBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [m] = await db
      .update(learnModulesTable)
      .set(parsed.data)
      .where(eq(learnModulesTable.id, String(req.params["moduleId"])))
      .returning();
    if (!m) {
      res.status(404).json({ error: "Module not found" });
      return;
    }
    res.json(UpdateModuleResponse.parse(await serializeModule(m, req.user!.id)));
  },
);

router.delete(
  "/admin/modules/:moduleId",
  requirePermission("canManageLearn"),
  async (req, res): Promise<void> => {
    const moduleId = String(req.params["moduleId"]);
    const moduleLessons = await db
      .select({ id: lessonsTable.id })
      .from(lessonsTable)
      .where(eq(lessonsTable.moduleId, moduleId));
    if (moduleLessons.length > 0) {
      const [progress] = await db
        .select({ count: sql<number>`count(*)` })
        .from(lessonProgressTable)
        .where(
          sql`${lessonProgressTable.lessonId} IN (${sql.join(
            moduleLessons.map((l) => sql`${l.id}`),
            sql`, `,
          )})`,
        );
      if (Number(progress?.count ?? 0) > 0) {
        res.status(409).json({
          error:
            "This module has learner progress and can't be deleted. Unpublish it instead.",
        });
        return;
      }
    }
    const [deleted] = await db
      .delete(learnModulesTable)
      .where(eq(learnModulesTable.id, moduleId))
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "Module not found" });
      return;
    }
    res.json(DeleteModuleResponse.parse({ ok: true }));
  },
);

router.post(
  "/admin/lessons",
  requirePermission("canManageLearn"),
  async (req, res): Promise<void> => {
    const parsed = CreateLessonBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const d = parsed.data;
    const [lesson] = await db
      .insert(lessonsTable)
      .values({
        moduleId: d.moduleId,
        title: d.title,
        description: d.description ?? null,
        bodyMd: d.bodyMd ?? null,
        videoProvider: d.videoProvider ?? null,
        videoUrl: d.videoUrl ?? null,
        durationSeconds: d.durationSeconds ?? 0,
        orderIndex: d.orderIndex ?? 0,
        isRequiredForOnboarding: d.isRequiredForOnboarding ?? true,
        allowManualComplete: d.allowManualComplete ?? true,
        isPublished: d.isPublished ?? true,
      })
      .returning();
    res
      .status(201)
      .json(
        CreateLessonResponse.parse(
          await serializeLesson(lesson, req.user!.id),
        ),
      );
  },
);

router.patch(
  "/admin/lessons/:lessonId",
  requirePermission("canManageLearn"),
  async (req, res): Promise<void> => {
    const parsed = UpdateLessonBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [lesson] = await db
      .update(lessonsTable)
      .set(parsed.data)
      .where(eq(lessonsTable.id, String(req.params["lessonId"])))
      .returning();
    if (!lesson) {
      res.status(404).json({ error: "Lesson not found" });
      return;
    }
    res.json(
      UpdateLessonResponse.parse(await serializeLesson(lesson, req.user!.id)),
    );
  },
);

router.delete(
  "/admin/lessons/:lessonId",
  requirePermission("canManageLearn"),
  async (req, res): Promise<void> => {
    const lessonId = String(req.params["lessonId"]);
    const [progress] = await db
      .select({ count: sql<number>`count(*)` })
      .from(lessonProgressTable)
      .where(eq(lessonProgressTable.lessonId, lessonId));
    if (Number(progress?.count ?? 0) > 0) {
      res.status(409).json({
        error:
          "This lesson has learner progress and can't be deleted. Unpublish it instead.",
      });
      return;
    }
    const [deleted] = await db
      .delete(lessonsTable)
      .where(eq(lessonsTable.id, lessonId))
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "Lesson not found" });
      return;
    }
    res.json(DeleteLessonResponse.parse({ ok: true }));
  },
);

router.get(
  "/admin/learn/onboarding-report",
  requirePermission("canManageLearn"),
  async (_req, res): Promise<void> => {
    const users = await db
      .select()
      .from(usersTable)
      .orderBy(asc(usersTable.createdAt));
    const requiredLessons = await db
      .select()
      .from(lessonsTable)
      .where(
        and(
          eq(lessonsTable.isRequiredForOnboarding, true),
          eq(lessonsTable.isPublished, true),
        ),
      );
    const requiredIds = new Set(requiredLessons.map((l) => l.id));
    const progress = await db
      .select()
      .from(lessonProgressTable)
      .where(eq(lessonProgressTable.status, "completed"));
    res.json(
      GetOnboardingReportResponse.parse(
        users.map((u) => {
          const completedRows = progress.filter(
            (p) => p.userId === u.id && requiredIds.has(p.lessonId),
          );
          const latest = completedRows
            .map((p) => p.completedAt)
            .filter(Boolean)
            .sort((a, b) => (b as Date).getTime() - (a as Date).getTime())[0];
          return {
            userId: u.id,
            userName: u.fullName,
            role: u.role,
            completedRequired: completedRows.length,
            totalRequired: requiredIds.size,
            onboardingComplete: u.onboardingComplete || u.role === "admin",
            completedAt: iso(latest ?? null),
          };
        }),
      ),
    );
  },
);

// ---- Credits admin ----

router.get(
  "/admin/credit-costs",
  requirePermission("canManageSettings"),
  async (_req, res): Promise<void> => {
    const rows = await db.select().from(creditCostsTable);
    res.json(
      GetCreditCostsResponse.parse(
        rows.map((r) => ({ operation: r.actionKey, cost: r.cost, label: r.label })),
      ),
    );
  },
);

router.put(
  "/admin/credit-costs",
  requirePermission("canManageSettings"),
  async (req, res): Promise<void> => {
    const parsed = UpdateCreditCostsBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    for (const c of parsed.data.costs) {
      await db
        .insert(creditCostsTable)
        .values({ actionKey: c.operation, cost: c.cost, label: c.label ?? c.operation })
        .onConflictDoUpdate({
          target: creditCostsTable.actionKey,
          set: { cost: c.cost, ...(c.label ? { label: c.label } : {}) },
        });
    }
    const rows = await db.select().from(creditCostsTable);
    res.json(
      UpdateCreditCostsResponse.parse(
        rows.map((r) => ({ operation: r.actionKey, cost: r.cost, label: r.label })),
      ),
    );
  },
);

router.get(
  "/admin/credit-report",
  requirePermission("canManageSettings"),
  async (_req, res): Promise<void> => {
    const byUser = await db
      .select({
        userId: creditTransactionsTable.userId,
        userName: usersTable.fullName,
        spent: sql<number>`coalesce(sum(-${creditTransactionsTable.amount}), 0)::int`,
      })
      .from(creditTransactionsTable)
      .innerJoin(usersTable, eq(usersTable.id, creditTransactionsTable.userId))
      .where(lt(creditTransactionsTable.amount, 0))
      .groupBy(creditTransactionsTable.userId, usersTable.fullName);
    const byOperation = await db
      .select({
        operation: sql<string>`coalesce(${creditTransactionsTable.actionKey}, 'other')`,
        spent: sql<number>`coalesce(sum(-${creditTransactionsTable.amount}), 0)::int`,
      })
      .from(creditTransactionsTable)
      .where(lt(creditTransactionsTable.amount, 0))
      .groupBy(creditTransactionsTable.actionKey);
    res.json(GetCreditReportResponse.parse({ byUser, byOperation }));
  },
);

// ---- Brand kit (readable by everyone signed in) ----

function serializeBrand(b?: typeof brandKitTable.$inferSelect) {
  return {
    logoUrl: b?.logoUrl ?? null,
    primaryColor: b?.primaryColor ?? "#0B3B2E",
    secondaryColor: b?.secondaryColor ?? "#1FA06B",
    accentColor: b?.accentColor ?? "#E3B341",
    headingFont: b?.headingFont ?? "Plus Jakarta Sans",
    bodyFont: b?.bodyFont ?? "Inter",
    defaultAuthor: b?.defaultAuthor ?? null,
    footerText: b?.footerText ?? null,
    defaultDisclaimer: b?.defaultDisclaimer ?? null,
  };
}

router.get("/brand-kit", async (_req, res): Promise<void> => {
  const [b] = await db.select().from(brandKitTable);
  res.json(GetBrandKitResponse.parse(serializeBrand(b)));
});

router.put(
  "/brand-kit",
  requirePermission("canManageSettings"),
  async (req, res): Promise<void> => {
    const parsed = UpdateBrandKitBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [b] = await db
      .insert(brandKitTable)
      .values({ id: "default", ...parsed.data })
      .onConflictDoUpdate({ target: brandKitTable.id, set: parsed.data })
      .returning();
    res.json(UpdateBrandKitResponse.parse(serializeBrand(b)));
  },
);

// ---- Settings ----

router.get(
  "/admin/settings",
  requirePermission("canManageSettings"),
  async (_req, res): Promise<void> => {
    res.json(GetSettingsResponse.parse(await getSettings()));
  },
);

router.put(
  "/admin/settings",
  requirePermission("canManageSettings"),
  async (req, res): Promise<void> => {
    const parsed = UpdateSettingsBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) await setSetting(key, String(value));
    }
    res.json(UpdateSettingsResponse.parse(await getSettings()));
  },
);

// ---- Audit logs ----

router.get(
  "/admin/audit-logs",
  requirePermission("canViewAuditLog"),
  async (req, res): Promise<void> => {
    const query = GetAuditLogsQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: query.error.message });
      return;
    }
    const filters = [];
    if (query.data.action)
      filters.push(eq(auditLogsTable.action, query.data.action));
    if (query.data.actorId)
      filters.push(eq(auditLogsTable.actorId, query.data.actorId));
    const rows = await db
      .select()
      .from(auditLogsTable)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(auditLogsTable.createdAt))
      .limit(200);
    res.json(
      GetAuditLogsResponse.parse(
        rows.map((r) => ({
          id: r.id,
          actorName: r.actorName,
          action: r.action,
          entityType: r.entityType,
          entityId: r.entityId,
          summary: r.detail,
          ip: null,
          createdAt: r.createdAt.toISOString(),
        })),
      ),
    );
  },
);

export default router;
