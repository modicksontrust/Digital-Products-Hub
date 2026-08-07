import {
  pgTable,
  text,
  integer,
  timestamp,
  uuid,
  jsonb,
} from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const creditTransactionsTable = pgTable("credit_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  amount: integer("amount").notNull(), // positive grant, negative spend
  balanceAfter: integer("balance_after").notNull(),
  kind: text("kind").notNull(), // grant|spend|request
  actionKey: text("action_key"),
  note: text("note"),
  actorId: uuid("actor_id").references(() => usersTable.id),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const creditCostsTable = pgTable("credit_costs", {
  actionKey: text("action_key").primaryKey(), // outline|chapter|rewrite|sales_copy|lead_magnet|export
  cost: integer("cost").notNull().default(1),
  label: text("label").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const brandKitTable = pgTable("brand_kit", {
  id: text("id").primaryKey().default("default"),
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color").notNull().default("#0B3B2E"),
  secondaryColor: text("secondary_color").notNull().default("#1FA06B"),
  accentColor: text("accent_color").notNull().default("#E3B341"),
  headingFont: text("heading_font").notNull().default("Plus Jakarta Sans"),
  bodyFont: text("body_font").notNull().default("Inter"),
  defaultAuthor: text("default_author"),
  footerText: text("footer_text"),
  defaultDisclaimer: text("default_disclaimer"),
  extras: jsonb("extras"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
