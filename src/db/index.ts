import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false,
    },
});
export const db = drizzle(pool, {
    logger: true,
});

export { clients, apiKeys } from "./schema/clients.js";
export { events, sessions } from "./schema/analytics.js";
