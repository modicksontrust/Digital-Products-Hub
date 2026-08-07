import { Router, type IRouter, type Request } from "express";
import { and, asc, eq, inArray } from "drizzle-orm";
import {
  db,
  learnModulesTable,
  lessonsTable,
  lessonProgressTable,
  usersTable,
} from "@workspace/db";
import {
  GetLearnModulesResponse,
  GetLessonResponse,
  PostLessonProgressBody,
  PostLessonProgressResponse,
  CompleteLessonResponse,
  GetLearnStatusResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { serializeLesson } from "../lib/serialize";
import { iso, getSettings, audit } from "../lib/helpers";

const router: IRouter = Router();
router.use(requireAuth);

async function orderedPublishedLessons() {
  const modules = await db
    .select()
    .from(learnModulesTable)
    .where(eq(learnModulesTable.isPublished, true))
    .orderBy(asc(learnModulesTable.orderIndex));
  const moduleIds = modules.map((m) => m.id);
  const lessons = moduleIds.length
    ? await db
        .select()
        .from(lessonsTable)
        .where(
          and(
            inArray(lessonsTable.moduleId, moduleIds),
            eq(lessonsTable.isPublished, true),
          ),
        )
        .orderBy(asc(lessonsTable.orderIndex))
    : [];
  const ordered = modules.flatMap((m) =>
    lessons.filter((l) => l.moduleId === m.id),
  );
  return { modules, lessons, ordered };
}

async function completedLessonIds(userId: string): Promise<Set<string>> {
  const rows = await db
    .select()
    .from(lessonProgressTable)
    .where(
      and(
        eq(lessonProgressTable.userId, userId),
        eq(lessonProgressTable.status, "completed"),
      ),
    );
  return new Set(rows.map((r) => r.lessonId));
}

async function lockedMap(
  userId: string,
): Promise<Map<string, boolean>> {
  const settings = await getSettings();
  const { ordered } = await orderedPublishedLessons();
  const completed = await completedLessonIds(userId);
  const map = new Map<string, boolean>();
  if (!settings.sequentialUnlock) {
    for (const l of ordered) map.set(l.id, false);
    return map;
  }
  let previousRequiredDone = true;
  for (const lesson of ordered) {
    if (!lesson.isRequiredForOnboarding) {
      map.set(lesson.id, false);
      continue;
    }
    map.set(lesson.id, !previousRequiredDone);
    previousRequiredDone = previousRequiredDone && completed.has(lesson.id);
  }
  return map;
}

async function learnStatus(user: { id: string }, justCompleted = false) {
  const { ordered } = await orderedPublishedLessons();
  const required = ordered.filter((l) => l.isRequiredForOnboarding);
  const completed = await completedLessonIds(user.id);
  const completedCount = required.filter((l) => completed.has(l.id)).length;
  const requiredCount = required.length;
  const nextLesson = required.find((l) => !completed.has(l.id));
  return {
    requiredCount,
    completedCount,
    percentComplete: requiredCount
      ? Math.round((completedCount / requiredCount) * 100)
      : 100,
    onboardingComplete: completedCount >= requiredCount,
    justCompleted,
    nextLessonId: nextLesson?.id ?? null,
  };
}

router.get("/learn/modules", async (req, res): Promise<void> => {
  const user = req.user!;
  const { modules, lessons } = await orderedPublishedLessons();
  const locks = await lockedMap(user.id);
  const out = [];
  for (const m of modules) {
    const ls = [];
    for (const l of lessons.filter((l) => l.moduleId === m.id)) {
      ls.push(await serializeLesson(l, user.id, locks.get(l.id) ?? false));
    }
    out.push({
      id: m.id,
      title: m.title,
      description: m.description,
      orderIndex: m.orderIndex,
      isPublished: m.isPublished,
      lessons: ls,
    });
  }
  res.json(GetLearnModulesResponse.parse(out));
});

router.get("/learn/status", async (req, res): Promise<void> => {
  res.json(GetLearnStatusResponse.parse(await learnStatus(req.user!)));
});

router.get("/learn/lessons/:lessonId", async (req, res): Promise<void> => {
  const user = req.user!;
  const lessonId = String(req.params["lessonId"]);
  const [lesson] = await db
    .select()
    .from(lessonsTable)
    .where(eq(lessonsTable.id, lessonId));
  if (!lesson || !lesson.isPublished) {
    res.status(404).json({ error: "Lesson not found" });
    return;
  }
  const locks = await lockedMap(user.id);
  const { ordered } = await orderedPublishedLessons();
  const idx = ordered.findIndex((l) => l.id === lessonId);
  const next = idx >= 0 ? ordered[idx + 1] : undefined;
  res.json(
    GetLessonResponse.parse({
      lesson: await serializeLesson(lesson, user.id, locks.get(lessonId) ?? false),
      nextLesson: next
        ? await serializeLesson(next, user.id, locks.get(next.id) ?? false)
        : undefined,
    }),
  );
});

async function upsertProgress(
  req: Request,
  lessonId: string,
  patch: {
    watchedSeconds?: number;
    furthestPosition?: number;
    status?: string;
    completedAt?: Date;
  },
) {
  const user = req.user!;
  const [existing] = await db
    .select()
    .from(lessonProgressTable)
    .where(
      and(
        eq(lessonProgressTable.userId, user.id),
        eq(lessonProgressTable.lessonId, lessonId),
      ),
    );
  if (existing) {
    const [updated] = await db
      .update(lessonProgressTable)
      .set({
        watchedSeconds: Math.max(
          existing.watchedSeconds,
          patch.watchedSeconds ?? 0,
        ),
        furthestPosition: Math.max(
          existing.furthestPosition,
          patch.furthestPosition ?? 0,
        ),
        status:
          existing.status === "completed"
            ? "completed"
            : (patch.status ?? "in_progress"),
        completedAt: existing.completedAt ?? patch.completedAt ?? null,
      })
      .where(eq(lessonProgressTable.id, existing.id))
      .returning();
    return updated;
  }
  const [created] = await db
    .insert(lessonProgressTable)
    .values({
      userId: user.id,
      lessonId,
      watchedSeconds: patch.watchedSeconds ?? 0,
      furthestPosition: patch.furthestPosition ?? 0,
      status: patch.status ?? "in_progress",
      completedAt: patch.completedAt ?? null,
    })
    .returning();
  return created;
}

router.post(
  "/learn/lessons/:lessonId/progress",
  async (req, res): Promise<void> => {
    const lessonId = String(req.params["lessonId"]);
    const parsed = PostLessonProgressBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [lesson] = await db
      .select()
      .from(lessonsTable)
      .where(eq(lessonsTable.id, lessonId));
    if (!lesson) {
      res.status(404).json({ error: "Lesson not found" });
      return;
    }
    const progress = await upsertProgress(req, lessonId, {
      watchedSeconds: parsed.data.watchedSeconds,
      furthestPosition: parsed.data.furthestPosition,
      status: "in_progress",
    });
    res.json(
      PostLessonProgressResponse.parse({
        lessonId: progress.lessonId,
        status: progress.status,
        watchedSeconds: progress.watchedSeconds,
        furthestPosition: progress.furthestPosition,
        completedAt: iso(progress.completedAt),
      }),
    );
  },
);

router.post(
  "/learn/lessons/:lessonId/complete",
  async (req, res): Promise<void> => {
    const user = req.user!;
    const lessonId = String(req.params["lessonId"]);
    const [lesson] = await db
      .select()
      .from(lessonsTable)
      .where(eq(lessonsTable.id, lessonId));
    if (!lesson) {
      res.status(404).json({ error: "Lesson not found" });
      return;
    }
    const settings = await getSettings();
    if (!settings.allowManualComplete && !lesson.allowManualComplete) {
      res.status(403).json({ error: "Manual completion is disabled for this lesson" });
      return;
    }
    const before = await learnStatus(user);
    await upsertProgress(req, lessonId, {
      status: "completed",
      completedAt: new Date(),
    });
    const after = await learnStatus(
      user,
      !before.onboardingComplete,
    );
    if (after.onboardingComplete && !user.onboardingComplete) {
      await db
        .update(usersTable)
        .set({ onboardingComplete: true })
        .where(eq(usersTable.id, user.id));
      await audit({
        actorId: user.id,
        actorName: user.fullName,
        action: "learn.onboarding_completed",
      });
    } else {
      after.justCompleted = false;
    }
    res.json(CompleteLessonResponse.parse(after));
  },
);

export default router;
