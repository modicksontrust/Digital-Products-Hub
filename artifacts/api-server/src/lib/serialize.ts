import { eq, asc } from "drizzle-orm";
import {
  db,
  productChaptersTable,
  lessonResourcesTable,
  lessonProgressTable,
  type Product,
  type ProductChapter,
} from "@workspace/db";
import { iso } from "./helpers";

export const wordCount = (text: string | null | undefined): number =>
  text ? text.trim().split(/\s+/).filter(Boolean).length : 0;

export function serializeChapter(ch: ProductChapter) {
  return {
    id: ch.id,
    productId: ch.productId,
    orderIndex: ch.orderIndex,
    title: ch.title,
    summary: ch.summary,
    contentMd: ch.contentMd,
    status: ch.status,
    wordCount: wordCount(ch.contentMd),
    errorMessage: null,
  };
}

export async function serializeProduct(
  product: Product,
  ownerName: string,
  chapters?: ProductChapter[],
) {
  const chs =
    chapters ??
    (await db
      .select()
      .from(productChaptersTable)
      .where(eq(productChaptersTable.productId, product.id))
      .orderBy(asc(productChaptersTable.orderIndex)));
  return {
    id: product.id,
    ownerId: product.ownerId,
    ownerName,
    type: product.type,
    title: product.title,
    subtitle: product.subtitle,
    authorName: product.authorName,
    topic: product.topic,
    audience: product.audience,
    tone: product.tone,
    language: product.language,
    depth: product.depth,
    region: product.region,
    lengthTier: product.lengthTier,
    status: product.status,
    coverConfig: (product.coverConfig ?? null) as Record<
      string,
      unknown
    > | null,
    chapterCount: chs.length,
    wordCount: chs.reduce((sum, c) => sum + wordCount(c.contentMd), 0),
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}

type LessonRow = {
  id: string;
  moduleId: string;
  title: string;
  description: string | null;
  bodyMd: string | null;
  videoProvider: string | null;
  videoUrl: string | null;
  durationSeconds: number;
  orderIndex: number;
  isRequiredForOnboarding: boolean;
  allowManualComplete: boolean;
  isPublished: boolean;
};

export async function serializeLesson(
  lesson: LessonRow,
  userId: string,
  locked = false,
) {
  const resources = await db
    .select()
    .from(lessonResourcesTable)
    .where(eq(lessonResourcesTable.lessonId, lesson.id));
  const [progress] = await db
    .select()
    .from(lessonProgressTable)
    .where(eq(lessonProgressTable.lessonId, lesson.id))
    .then((rows) => rows.filter((r) => r.userId === userId));
  return {
    id: lesson.id,
    moduleId: lesson.moduleId,
    title: lesson.title,
    description: lesson.description,
    bodyMd: lesson.bodyMd,
    videoProvider: lesson.videoProvider,
    videoUrl: lesson.videoUrl,
    durationSeconds: lesson.durationSeconds,
    orderIndex: lesson.orderIndex,
    isRequiredForOnboarding: lesson.isRequiredForOnboarding,
    allowManualComplete: lesson.allowManualComplete,
    isPublished: lesson.isPublished,
    locked,
    resources: resources.map((r) => ({
      id: r.id,
      label: r.label,
      externalUrl: r.externalUrl,
    })),
    progress: progress
      ? {
          lessonId: progress.lessonId,
          status: progress.status as
            | "not_started"
            | "in_progress"
            | "completed",
          watchedSeconds: progress.watchedSeconds,
          furthestPosition: progress.furthestPosition,
          completedAt: iso(progress.completedAt),
        }
      : undefined,
  };
}
