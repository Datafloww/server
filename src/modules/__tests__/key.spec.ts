import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { generateApiKey } from "../key"; // Adjust the import based on your actual module
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";

import { clients, apiKeys } from "../../db/schema/clients.js";
import { events, sessions } from "../../db/schema/analytics.js";

const db = drizzle(
    "postgres://postgres:1234@df@localhost:5432/datafloww_test_db"
);

beforeAll(async () => {
    // Set up test database connection
    // Initialize your database connection here
});

afterAll(async () => {
    // Clean up test database connection
    // Close your database connection here
});

describe("generateApiKey", () => {
    it("should generate a valid API key", () => {
        const apiKey = generateApiKey("67af893d003b8007df49");
        expect(apiKey).toBeDefined();
        expect(apiKey).toHaveLength(10); // Assuming the API key length is 32
    });
    // Add more tests as needed
});
