import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

export const metrics = pgTable("metrics", {
    id: serial("id").primaryKey(),
    writeKey: text("write_key"),
    type: text("metric_type"),
    value: integer("value").notNull(),
    periodStart: timestamp("period_start").notNull(),
    periodEnd: timestamp("period_end").notNull(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
