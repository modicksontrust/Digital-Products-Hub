import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { bioLinksTable, usersTable } from "./users";

/**
 * Anonymous Link in Bio activity. Events intentionally contain no visitor
 * identifiers, request metadata, or client attributes.
 */
export const bioAnalyticsEventsTable = pgTable(
  "bio_analytics_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => usersTable.id, { onDelete: "cascade" }),
    bioLinkId: uuid("bio_link_id").references(() => bioLinksTable.id, {
      onDelete: "set null",
    }),
    eventType: text("event_type").notNull(), // page_view|link_click
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("bio_analytics_events_user_type_idx").on(
      table.userId,
      table.eventType,
    ),
    index("bio_analytics_events_link_type_idx").on(
      table.bioLinkId,
      table.eventType,
    ),
  ],
);

export const insertBioAnalyticsEventSchema = createInsertSchema(
  bioAnalyticsEventsTable,
).omit({ id: true, createdAt: true });

export type InsertBioAnalyticsEvent = z.infer<
  typeof insertBioAnalyticsEventSchema
>;
export type BioAnalyticsEvent = typeof bioAnalyticsEventsTable.$inferSelect;