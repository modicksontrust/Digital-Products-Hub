import { eq } from "drizzle-orm";
import {
  db,
  usersTable,
  auditLogsTable,
  notificationsTable,
  creditTransactionsTable,
  creditCostsTable,
  settingsTable,
  type User,
} from "@workspace/db";
import { permissionsFor } from "./permissions";

export const iso = (d: Date | null | undefined): string | null =>
  d ? d.toISOString() : null;

export function sessionUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    status: user.status,
    creditsBalance: user.creditsBalance,
    onboardingComplete: user.onboardingComplete,
    onboardingExempt: user.onboardingExempt,
    avatarUrl: null,
    lastLoginAt: iso(user.lastLoginAt),
    permissions: permissionsFor(user.role),
  };
}

export async function audit(input: {
  actorId?: string | null;
  actorName?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  detail?: string;
}): Promise<void> {
  await db.insert(auditLogsTable).values({
    actorId: input.actorId ?? null,
    actorName: input.actorName ?? null,
    action: input.action,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    detail: input.detail ?? null,
  });
}

export async function notify(input: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  linkPath?: string;
}): Promise<void> {
  await db.insert(notificationsTable).values({
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    linkPath: input.linkPath ?? null,
  });
}

export async function notifyAdmins(input: {
  type: string;
  title: string;
  body?: string;
  linkPath?: string;
}): Promise<void> {
  const admins = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.role, "admin"));
  for (const admin of admins) {
    await notify({ userId: admin.id, ...input });
  }
}

export async function getCreditCost(actionKey: string): Promise<number> {
  const [row] = await db
    .select()
    .from(creditCostsTable)
    .where(eq(creditCostsTable.actionKey, actionKey));
  return row?.cost ?? 1;
}

export class InsufficientCreditsError extends Error {
  constructor(public required: number, public balance: number) {
    super("Insufficient credits");
  }
}

/** Deduct credits atomically; throws InsufficientCreditsError. */
export async function spendCredits(input: {
  userId: string;
  amount: number;
  actionKey: string;
  note?: string;
}): Promise<number> {
  if (input.amount <= 0) {
    const [u] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, input.userId));
    return u?.creditsBalance ?? 0;
  }
  return db.transaction(async (tx) => {
    const [user] = await tx
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, input.userId))
      .for("update");
    if (!user) throw new Error("User not found");
    if (user.role !== "admin" && user.creditsBalance < input.amount) {
      throw new InsufficientCreditsError(input.amount, user.creditsBalance);
    }
    const newBalance =
      user.role === "admin"
        ? user.creditsBalance
        : user.creditsBalance - input.amount;
    if (user.role !== "admin") {
      await tx
        .update(usersTable)
        .set({ creditsBalance: newBalance })
        .where(eq(usersTable.id, user.id));
    }
    await tx.insert(creditTransactionsTable).values({
      userId: user.id,
      amount: -input.amount,
      balanceAfter: newBalance,
      kind: "spend",
      actionKey: input.actionKey,
      note: input.note ?? null,
    });
    return newBalance;
  });
}

export async function grantCredits(input: {
  userId: string;
  amount: number;
  actorId?: string;
  note?: string;
}): Promise<User> {
  return db.transaction(async (tx) => {
    const [user] = await tx
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, input.userId))
      .for("update");
    if (!user) throw new Error("User not found");
    const newBalance = user.creditsBalance + input.amount;
    const [updated] = await tx
      .update(usersTable)
      .set({ creditsBalance: newBalance })
      .where(eq(usersTable.id, user.id))
      .returning();
    await tx.insert(creditTransactionsTable).values({
      userId: user.id,
      amount: input.amount,
      balanceAfter: newBalance,
      kind: "grant",
      actionKey: "grant",
      note: input.note ?? null,
      actorId: input.actorId ?? null,
    });
    return updated;
  });
}

const SETTING_DEFAULTS: Record<string, string> = {
  sequentialUnlock: "true",
  allowManualComplete: "true",
  approvalWorkflowEnabled: "true",
  uploaderCanGenerate: "false",
  managerWeeklyGrantCap: "200",
};

export async function getSettings(): Promise<{
  sequentialUnlock: boolean;
  allowManualComplete: boolean;
  approvalWorkflowEnabled: boolean;
  uploaderCanGenerate: boolean;
  managerWeeklyGrantCap: number;
}> {
  const rows = await db.select().from(settingsTable);
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const get = (k: string) => map.get(k) ?? SETTING_DEFAULTS[k];
  return {
    sequentialUnlock: get("sequentialUnlock") === "true",
    allowManualComplete: get("allowManualComplete") === "true",
    approvalWorkflowEnabled: get("approvalWorkflowEnabled") === "true",
    uploaderCanGenerate: get("uploaderCanGenerate") === "true",
    managerWeeklyGrantCap: Number(get("managerWeeklyGrantCap") ?? 200),
  };
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db
    .insert(settingsTable)
    .values({ key, value })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value } });
}
