import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, type User } from "@workspace/db";
import { hasPermission, type PermissionKey } from "../lib/permissions";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const userId = req.session.userId;
  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId));
  if (!user || user.status !== "active") {
    req.session.destroy(() => undefined);
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  req.user = user;
  next();
}

/** Blocks non-admins who have not completed onboarding. */
export function requireOnboarding(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const user = req.user;
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  if (
    user.role !== "admin" &&
    !user.onboardingComplete &&
    !user.onboardingExempt
  ) {
    res.status(403).json({
      error: "Complete onboarding to access this feature",
      code: "ONBOARDING_REQUIRED",
    });
    return;
  }
  next();
}

export function requirePermission(key: PermissionKey) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    if (!hasPermission(user.role, key)) {
      res.status(403).json({ error: "Not permitted" });
      return;
    }
    next();
  };
}
