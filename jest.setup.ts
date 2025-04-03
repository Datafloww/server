// jest.setup.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "path";
import { beforeAll, afterAll } from "@jest/globals";

declare global {
    // eslint-disable-next-line no-var
    var testDb: ReturnType<typeof drizzle>;
    // eslint-disable-next-line no-var
    var dbPool: Pool;
}

// Use environment variables or default values for test database
const pool = new Pool({
    host: process.env.TEST_PG_HOST || "localhost",
    port: Number(process.env.TEST_PG_PORT) || 5432,
    user: process.env.TEST_PG_USER || "postgres",
    password: process.env.TEST_PG_PASSWORD || "1234",
    database: process.env.TEST_PG_DATABASE || "datafloww_test_db",
});

// Make db accessible globally for tests
global.dbPool = pool;
global.testDb = drizzle(pool);

// Run migrations before tests begin
// beforeAll(async () => {
//     // Adjust the path to your migrations folder
//     const migrationsFolder = path.join(
//         path.dirname(new URL(import.meta.url).pathname),
//         "drizzle"
//     );
//     try {
//         await migrate(global.testDb, { migrationsFolder });
//         console.log("Migrations completed for test database");
//     } catch (err) {
//         console.error("Migration failed:", err);
//         throw err;
//     }
// });

// Close pool after all tests
afterAll(async () => {
    await global.dbPool.end();
});
