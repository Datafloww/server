import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";

export { clients, apiKeys } from "./schema/clients.js";
export { events } from "./schema/events.js";

export const db = drizzle(process.env.DATABASE_URL)!;
