import { pgTable, foreignKey, serial, text, jsonb, timestamp, integer, boolean, unique } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const events = pgTable("events", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id"),
	sessionId: text("session_id").notNull(),
	eventName: text("event_name").notNull(),
	eventType: text("event_type").notNull(),
	url: text(),
	path: text(),
	referrer: text(),
	userAgent: text("user_agent"),
	browser: text(),
	os: text(),
	deviceType: text("device_type"),
	clientIp: text("client_ip"),
	properties: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	anonymousId: text("anonymous_id"),
	clientId: text("client_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.clientId],
			name: "events_client_id_client_client_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.userId],
			name: "events_user_id_users_user_id_fk"
		}),
	foreignKey({
			columns: [table.sessionId],
			foreignColumns: [sessions.id],
			name: "events_session_id_sessions_id_fk"
		}),
]);

export const sessions = pgTable("sessions", {
	id: text().primaryKey().notNull(),
	userId: text("user_id"),
	firstSeen: timestamp("first_seen", { mode: 'string' }).defaultNow().notNull(),
	lastSeen: timestamp("last_seen", { mode: 'string' }).defaultNow().notNull(),
	duration: integer().default(0),
	pageViews: integer("page_views").default(1),
	interactions: integer().default(0),
	referrer: text(),
	entryPage: text("entry_page"),
	exitPage: text("exit_page"),
	userAgent: text("user_agent"),
	deviceInfo: jsonb("device_info").default({}),
	active: boolean().default(true),
	clientId: text("client_id").notNull(),
	anonymousId: text("anonymous_id"),
}, (table) => [
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.clientId],
			name: "sessions_client_id_client_client_id_fk"
		}).onDelete("cascade"),
]);

export const client = pgTable("client", {
	id: serial().notNull(),
	clientId: text("client_id").primaryKey().notNull(),
	email: text().notNull(),
}, (table) => [
	unique("client_email_unique").on(table.email),
]);

export const apiKeys = pgTable("api_keys", {
	id: text().primaryKey().notNull(),
	keyHash: text("key_hash").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }),
	updatedAt: timestamp("updated_at", { precision: 3, mode: 'string' }),
	key: text().notNull(),
	keyId: text("key_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.id],
			foreignColumns: [client.clientId],
			name: "api_keys_id_client_client_id_fk"
		}).onDelete("cascade"),
	unique("api_keys_key_key").on(table.key),
	unique("api_keys_key_id_key").on(table.keyId),
]);

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	clientId: text("client_id").notNull(),
	userId: text("user_id"),
	anonymousId: text("anonymous_id"),
	email: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [client.clientId],
			name: "users_client_id_client_client_id_fk"
		}).onDelete("cascade"),
	unique("users_user_id_unique").on(table.userId),
	unique("users_anonymous_id_unique").on(table.anonymousId),
]);
