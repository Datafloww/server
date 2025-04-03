import {
    pgTable,
    serial,
    integer,
    boolean,
    text,
    jsonb,
    timestamp,
} from "drizzle-orm/pg-core";
import { InferInsertModel } from "drizzle-orm";

import { clients } from "./clients.js";

export const users = pgTable("users", {
    id: serial("id").primaryKey(),
    clientId: text("client_id")
        .notNull()
        .references(() => clients.clientId, {
            onDelete: "cascade",
        }),
    userId: text("user_id").unique(), // Client-specific user identifier
    anonId: text("anonymous_id").unique(), // Optional anonymous identifier
    email: text("email"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Events table
export const events = pgTable("events", {
    id: serial("id").primaryKey(),
    clientId: text("client_id")
        .notNull()
        .references(() => clients.clientId, {
            onDelete: "cascade",
        }),
    userId: text("user_id").references(() => users.userId), // References users.userId
    anonId: text("anonymous_id"), // Used when userId isn't available
    sessionId: text("session_id")
        .notNull()
        .references(() => sessions.id),
    eventName: text("event_name").notNull(),
    eventType: text("event_type").notNull(),
    url: text("url"),
    path: text("path"),
    referrer: text("referrer"),
    userAgent: text("user_agent"),
    browser: text("browser"),
    os: text("os"),
    deviceType: text("device_type"),
    clientIp: text("client_ip"),
    properties: jsonb("properties"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Sessions table
export const sessions = pgTable("sessions", {
    id: text("id").primaryKey(),
    clientId: text("client_id")
        .notNull()
        .references(() => clients.clientId, {
            onDelete: "cascade",
        }),
    userId: text("user_id"),
    anonId: text("anonymous_id"), // Used when userId isn't available
    firstSeen: timestamp("first_seen").defaultNow().notNull(),
    lastSeen: timestamp("last_seen").defaultNow().notNull(),
    duration: integer("duration").default(0),
    pageViews: integer("page_views").default(1),
    interactions: integer("interactions").default(0),
    referrer: text("referrer"),
    entryPage: text("entry_page"),
    exitPage: text("exit_page"),
    userAgent: text("user_agent"),
    deviceInfo: jsonb("device_info").default({}),
    active: boolean("active").default(true),
});

// Define the events table first
export type InsertUser = InferInsertModel<typeof users>;
export type InsertEvent = InferInsertModel<typeof events>;
export type InsertSession = InferInsertModel<typeof sessions>;
