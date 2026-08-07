import {
  pgTable,
  text,
  integer,
  timestamp,
  uuid,
  jsonb,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const productsTable = pgTable("products", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => usersTable.id),
  type: text("type").notNull().default("ebook"), // ebook|lead_magnet
  leadMagnetFormat: text("lead_magnet_format"),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  topic: text("topic"),
  audience: text("audience"),
  tone: text("tone"),
  language: text("language").notNull().default("English"),
  depth: text("depth").notNull().default("standard"),
  region: text("region"),
  lengthTier: text("length_tier"),
  keyPoints: text("key_points"),
  ctaText: text("cta_text"),
  status: text("status").notNull().default("draft"), // draft|generating|ready|in_review|changes_requested|approved|archived
  coverConfig: jsonb("cover_config"),
  requestedChapterCount: integer("requested_chapter_count")
    .notNull()
    .default(8),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Product = typeof productsTable.$inferSelect;

export const productChaptersTable = pgTable("product_chapters", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  orderIndex: integer("order_index").notNull().default(0),
  title: text("title").notNull(),
  summary: text("summary"),
  contentMd: text("content_md"),
  status: text("status").notNull().default("pending"), // pending|generating|ready|failed
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type ProductChapter = typeof productChaptersTable.$inferSelect;

export const salesCopyTable = pgTable("sales_copy", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" })
    .unique(),
  headline: text("headline"),
  subheadline: text("subheadline"),
  bullets: jsonb("bullets"),
  whoItsFor: text("who_its_for"),
  faq: jsonb("faq"),
  ctaText: text("cta_text"),
  suggestedPriceBand: text("suggested_price_band"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const productExportsTable = pgTable("product_exports", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  createdById: uuid("created_by_id").references(() => usersTable.id),
  format: text("format").notNull().default("pdf"),
  pageSize: text("page_size").notNull().default("A4"),
  theme: text("theme").notNull().default("classic"),
  version: integer("version").notNull().default(1),
  status: text("status").notNull().default("ready"), // processing|ready|failed
  filePath: text("file_path"),
  pageCount: integer("page_count"),
  fileSizeBytes: integer("file_size_bytes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const reviewsTable = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  reviewerId: uuid("reviewer_id").references(() => usersTable.id),
  decision: text("decision").notNull(), // approved|changes_requested
  comment: text("comment"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const commentsTable = pgTable("comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  chapterId: uuid("chapter_id").references(() => productChaptersTable.id, {
    onDelete: "set null",
  }),
  authorId: uuid("author_id").references(() => usersTable.id),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const generationJobsTable = pgTable("generation_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id").references(() => productsTable.id, {
    onDelete: "cascade",
  }),
  userId: uuid("user_id").references(() => usersTable.id),
  type: text("type").notNull(), // outline|chapters|rewrite|sales_copy|lead_magnet
  status: text("status").notNull().default("queued"), // queued|running|succeeded|failed
  progressLabel: text("progress_label"),
  completedUnits: integer("completed_units").notNull().default(0),
  totalUnits: integer("total_units").notNull().default(0),
  chapterStatuses: jsonb("chapter_statuses"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
