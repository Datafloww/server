import { randomBytes } from "crypto";
import bcrypt from "bcrypt";
import { db, apiKeys } from "../db/index.js";
import { eq } from "drizzle-orm";

export async function generateApiKey(clientId: string) {
    const apiKey = randomBytes(10).toString("hex");
    const hashedKey = await bcrypt.hash(apiKey, 10);
    await db
        .update(apiKeys)
        .set({ keyHash: hashedKey })
        .where(eq(apiKeys.id, clientId));
    return apiKey;
}

export async function validateApiKey(clientId: string, inputKey: string) {
    const key = db
        .select({ hash: apiKeys.keyHash })
        .from(apiKeys)
        .where(eq(apiKeys.id, clientId));

    const storedHash = key[0].hash;
    if (!storedHash) {
        return false;
    }
    return await bcrypt.compare(inputKey, storedHash);
}
