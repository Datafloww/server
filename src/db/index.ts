import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";

export { clients, apiKeys } from "./schema/clients.js";
export { events, sessions } from "./schema/analytics.js";

export const db = drizzle(process.env.DATABASE_URL!);
