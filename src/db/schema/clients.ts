import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const clients = pgTable("client", {
    id: serial("id"),
    clientId: text("client_id").notNull().unique().primaryKey(),
    email: text("email").notNull().unique(),
});

export const apiKeys = pgTable("api_keys", {
    id: text("id")
        .primaryKey()
        .references(() => clients.clientId, {
            onDelete: "cascade",
        }),
    key: text("key").unique().notNull(),
    keyId: text("key_id").notNull().unique(),
    keyHash: text("key_hash").notNull(),
    createdAt: timestamp("created_at").$onUpdate(() => new Date()),
    updatedAt: timestamp("updated_at", {
        mode: "date",
        precision: 3,
    }).$onUpdate(() => new Date()),
});
