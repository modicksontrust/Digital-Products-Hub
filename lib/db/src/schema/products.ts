import {
  pgTable,
  text,
  integer,
  boolean,
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
  authorName: text("author_name"),
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
  priceCents: integer("price_cents"),
  published: boolean("published").notNull().default(false),
  slug: text("slug").unique(),
  requestedChapterCount: integer("requested_chapter_count")
    .notNull()
    .default(8),
  // --- Sell settings ---
  productSaleType: text("product_sale_type").default("ebook"), // ebook|digital_download|course|template|membership|service|license|exclusive_link
  pricingMode: text("pricing_mode").default("fixed"), // free|fixed|pwyw|tiered
  currency: text("currency").default("USD"),
  saleShortDescription: text("sale_short_description"),
  saleFullDescription: text("sale_full_description"),
  saleTheme: text("sale_theme").default("dark"), // dark|light
  deliveryMethod: text("delivery_method"), // link|whatsapp|access_key
  deliveryUrl: text("delivery_url"),
  deliveryWhatsappNumber: text("delivery_whatsapp_number"),
  deliveryWhatsappMessage: text("delivery_whatsapp_message"),
  deliveryAccessKeys: text("delivery_access_keys"), // newline-separated keys
  deliveryDuration: text("delivery_duration").default("lifetime"), // lifetime|limited
  deliveryDurationDays: integer("delivery_duration_days"),
  limitedQuantityEnabled: boolean("limited_quantity_enabled").notNull().default(false),
  limitedQuantity: integer("limited_quantity"),
  earlyBirdEnabled: boolean("early_bird_enabled").notNull().default(false),
  testimonials: jsonb("testimonials"),
  contractEnabled: boolean("contract_enabled").notNull().default(false),
  orderCount: integer("order_count").notNull().default(0),
  showOnBio: boolean("show_on_bio").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Product = typeof productsTable.$inferSelect;

export const productCoversTable = pgTable("product_covers", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  styleKey: text("style_key").notNull(), // e.g. split_diagonal_departure, uploaded
  styleLabel: text("style_label").notNull(),
  imagePath: text("image_path").notNull(), // /objects/... path served via /storage/objects
  source: text("source").notNull().default("ai"), // ai|uploaded
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ProductCover = typeof productCoversTable.$inferSelect;

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

export const discountCodesTable = pgTable("discount_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: uuid("owner_id")
    .notNull()
    .references(() => usersTable.id),
  productId: uuid("product_id").references(() => productsTable.id, {
    onDelete: "cascade",
  }),
  code: text("code").notNull(),
  discountType: text("discount_type").notNull().default("percent"), // percent|fixed_cents
  discountValue: integer("discount_value").notNull(), // % or cents
  maxUses: integer("max_uses"),
  useCount: integer("use_count").notNull().default(0),
  active: boolean("active").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type DiscountCode = typeof discountCodesTable.$inferSelect;

export const previewTokensTable = pgTable("preview_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => productsTable.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
