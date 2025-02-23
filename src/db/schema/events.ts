import { pgTable, serial, text, jsonb, timestamp } from "drizzle-orm/pg-core";

import { clients } from "./clients.js";

export const events = pgTable("events", {
    id: serial("id"),
    userId: text("user_id")
        .notNull()
        .primaryKey()
        .references(() => clients.clientId, { onDelete: "cascade" }),
    eventName: text("event_name").notNull(),
    properties: jsonb("properties").default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});
