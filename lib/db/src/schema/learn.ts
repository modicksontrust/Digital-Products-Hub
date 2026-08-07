import {
  pgTable,
  text,
  boolean,
  integer,
  timestamp,
  uuid,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

// The onboarding curriculum is organized into a fixed 3-stage journey:
// create (Day 1), validate (Day 2-8), sell_scale (Day 9-30).
export const learnModulesTable = pgTable("learn_modules", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  description: text("description"),
  stage: text("stage").notNull().default("create"), // create|validate|sell_scale
  orderIndex: integer("order_index").notNull().default(0),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const lessonsTable = pgTable("lessons", {
  id: uuid("id").primaryKey().defaultRandom(),
  moduleId: uuid("module_id")
    .notNull()
    .references(() => learnModulesTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  bodyMd: text("body_md"),
  videoProvider: text("video_provider"),
  videoUrl: text("video_url"),
  durationSeconds: integer("duration_seconds").notNull().default(0),
  orderIndex: integer("order_index").notNull().default(0),
  isRequiredForOnboarding: boolean("is_required_for_onboarding")
    .notNull()
    .default(true),
  allowManualComplete: boolean("allow_manual_complete").notNull().default(true),
  isPublished: boolean("is_published").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const lessonResourcesTable = pgTable("lesson_resources", {
  id: uuid("id").primaryKey().defaultRandom(),
  lessonId: uuid("lesson_id")
    .notNull()
    .references(() => lessonsTable.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  externalUrl: text("external_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const lessonProgressTable = pgTable(
  "lesson_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lessonsTable.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("not_started"), // not_started|in_progress|completed
    watchedSeconds: integer("watched_seconds").notNull().default(0),
    furthestPosition: integer("furthest_position").notNull().default(0),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [uniqueIndex("lesson_progress_user_lesson").on(t.userId, t.lessonId)],
);
