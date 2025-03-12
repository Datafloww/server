import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";

export { clients, apiKeys } from "./schema/clients";
export { events, sessions } from "./schema/analytics";

export const db = drizzle(process.env.DATABASE_URL!);
