import { relations } from "drizzle-orm/relations";
import { client, events, users, sessions, apiKeys } from "./schema";

export const eventsRelations = relations(events, ({one}) => ({
	client: one(client, {
		fields: [events.clientId],
		references: [client.clientId]
	}),
	user: one(users, {
		fields: [events.userId],
		references: [users.userId]
	}),
	session: one(sessions, {
		fields: [events.sessionId],
		references: [sessions.id]
	}),
}));

export const clientRelations = relations(client, ({many}) => ({
	events: many(events),
	sessions: many(sessions),
	apiKeys: many(apiKeys),
	users: many(users),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	events: many(events),
	client: one(client, {
		fields: [users.clientId],
		references: [client.clientId]
	}),
}));

export const sessionsRelations = relations(sessions, ({one, many}) => ({
	events: many(events),
	client: one(client, {
		fields: [sessions.clientId],
		references: [client.clientId]
	}),
}));

export const apiKeysRelations = relations(apiKeys, ({one}) => ({
	client: one(client, {
		fields: [apiKeys.id],
		references: [client.clientId]
	}),
}));