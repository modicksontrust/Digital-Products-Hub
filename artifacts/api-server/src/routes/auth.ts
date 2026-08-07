import { Router, type IRouter } from "express";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq, isNull, gt } from "drizzle-orm";
import {
  db,
  usersTable,
  invitationsTable,
  passwordResetsTable,
  accessRequestsTable,
} from "@workspace/db";
import {
  LoginBody,
  LoginResponse,
  GetMeResponse,
  GetInviteResponse,
  AcceptInviteBody,
  AcceptInviteResponse,
  ForgotPasswordBody,
  ForgotPasswordResponse,
  ResetPasswordBody,
  ResetPasswordResponse,
  UpdateAccountBody,
  UpdateAccountResponse,
  CreateAccessRequestBody,
  CreateAccessRequestResponse,
} from "@workspace/api-zod";
import { sessionUser, audit, notifyAdmins } from "../lib/helpers";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, parsed.data.email.toLowerCase().trim()));
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }
  if (user.status !== "active") {
    res.status(403).json({ error: "Your account is deactivated" });
    return;
  }
  req.session.userId = user.id;
  const [updated] = await db
    .update(usersTable)
    .set({ lastLoginAt: new Date() })
    .where(eq(usersTable.id, user.id))
    .returning();
  await audit({ actorId: user.id, actorName: user.fullName, action: "auth.login" });
  res.json(LoginResponse.parse(sessionUser(updated)));
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

router.get("/auth/me", requireAuth, (req, res): void => {
  res.json(GetMeResponse.parse(sessionUser(req.user!)));
});

router.get("/invites/:token", async (req, res): Promise<void> => {
  const token = String(req.params["token"]);
  const [invite] = await db
    .select()
    .from(invitationsTable)
    .where(eq(invitationsTable.token, token));
  if (!invite) {
    res.json(
      GetInviteResponse.parse({
        email: "",
        role: "",
        valid: false,
        invalidReason: "This invitation link is not valid.",
      }),
    );
    return;
  }
  let invalidReason: string | null = null;
  if (invite.status === "accepted") invalidReason = "This invitation was already used.";
  else if (invite.status === "revoked") invalidReason = "This invitation was revoked.";
  else if (invite.expiresAt < new Date()) invalidReason = "This invitation has expired.";
  res.json(
    GetInviteResponse.parse({
      email: invite.email,
      role: invite.role,
      valid: !invalidReason,
      invalidReason,
    }),
  );
});

router.post("/invites/:token/accept", async (req, res): Promise<void> => {
  const token = String(req.params["token"]);
  const parsed = AcceptInviteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [invite] = await db
    .select()
    .from(invitationsTable)
    .where(eq(invitationsTable.token, token));
  if (!invite || invite.status !== "pending" || invite.expiresAt < new Date()) {
    res.status(400).json({ error: "This invitation is no longer valid" });
    return;
  }
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, invite.email));
  if (existing) {
    res.status(400).json({ error: "An account with this email already exists" });
    return;
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const [user] = await db
    .insert(usersTable)
    .values({
      email: invite.email,
      fullName: parsed.data.fullName,
      passwordHash,
      role: invite.role,
      creditsBalance: invite.initialCredits,
      lastLoginAt: new Date(),
    })
    .returning();
  await db
    .update(invitationsTable)
    .set({ status: "accepted", acceptedAt: new Date() })
    .where(eq(invitationsTable.id, invite.id));
  req.session.userId = user.id;
  await audit({
    actorId: user.id,
    actorName: user.fullName,
    action: "auth.invite_accepted",
    entityType: "user",
    entityId: user.id,
  });
  res.status(201).json(AcceptInviteResponse.parse(sessionUser(user)));
});

router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const parsed = ForgotPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, parsed.data.email.toLowerCase().trim()));
  if (!user) {
    // Do not reveal whether the account exists
    res.json(ForgotPasswordResponse.parse({ ok: true, resetUrl: null }));
    return;
  }
  const token = crypto.randomBytes(24).toString("hex");
  await db.insert(passwordResetsTable).values({
    userId: user.id,
    token,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60),
  });
  // No email delivery in Phase 1: return the reset link directly.
  res.json(
    ForgotPasswordResponse.parse({ ok: true, resetUrl: `/reset-password?token=${token}` }),
  );
});

router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const parsed = ResetPasswordBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [reset] = await db
    .select()
    .from(passwordResetsTable)
    .where(
      and(
        eq(passwordResetsTable.token, parsed.data.token),
        isNull(passwordResetsTable.usedAt),
        gt(passwordResetsTable.expiresAt, new Date()),
      ),
    );
  if (!reset) {
    res.status(400).json({ error: "This reset link is invalid or expired" });
    return;
  }
  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  await db
    .update(usersTable)
    .set({ passwordHash })
    .where(eq(usersTable.id, reset.userId));
  await db
    .update(passwordResetsTable)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetsTable.id, reset.id));
  res.json(ResetPasswordResponse.parse({ ok: true }));
});

router.patch("/auth/account", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpdateAccountBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const user = req.user!;
  const patch: Partial<typeof usersTable.$inferInsert> = {};
  if (parsed.data.fullName) patch.fullName = parsed.data.fullName;
  if (parsed.data.newPassword) {
    if (
      !parsed.data.currentPassword ||
      !(await bcrypt.compare(parsed.data.currentPassword, user.passwordHash))
    ) {
      res.status(400).json({ error: "Current password is incorrect" });
      return;
    }
    if (parsed.data.newPassword.length < 8) {
      res.status(400).json({ error: "New password must be at least 8 characters" });
      return;
    }
    patch.passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  }
  const [updated] = await db
    .update(usersTable)
    .set(patch)
    .where(eq(usersTable.id, user.id))
    .returning();
  res.json(UpdateAccountResponse.parse(sessionUser(updated)));
});

router.post("/access-requests", async (req, res): Promise<void> => {
  const parsed = CreateAccessRequestBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await db.insert(accessRequestsTable).values({
    fullName: parsed.data.name,
    email: parsed.data.email.toLowerCase().trim(),
    reason: [parsed.data.requestedRole, parsed.data.message]
      .filter(Boolean)
      .join(" — "),
  });
  await notifyAdmins({
    type: "access_request",
    title: `${parsed.data.name} requested access`,
    body: parsed.data.email,
    linkPath: "/admin/access-requests",
  });
  res.status(201).json(CreateAccessRequestResponse.parse({ ok: true }));
});

export default router;
