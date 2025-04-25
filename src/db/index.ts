import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    idleTimeoutMillis: 0, // Disable idle timeout
});

export const db = drizzle(pool);

export { clients, apiKeys } from "./schema/clients.js";
export { events, sessions } from "./schema/analytics.js";
