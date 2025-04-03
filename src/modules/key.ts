import { randomBytes } from "crypto";
import bcrypt from "bcrypt";
import { db, apiKeys } from "../db/index.js";
import { eq } from "drizzle-orm";

export async function generateApiKey(clientId: string) {
    const keyId = crypto.randomUUID().split("-")[0];
    const rawKey = randomBytes(4).toString("hex");
    const hashedKey = (await bcrypt.hash(rawKey, 10)).concat(`-${keyId}`);
    await db
        .update(apiKeys)
        .set({ key: rawKey.concat(`-${keyId}`) })
        .where(eq(apiKeys.id, clientId));
    await db
        .update(apiKeys)
        .set({ keyHash: hashedKey })
        .where(eq(apiKeys.id, clientId));
    await db.update(apiKeys).set({ keyId }).where(eq(apiKeys.id, clientId));
    return rawKey.concat(`-${keyId}`);
}

export async function validateApiKey(
    inputKey: string | null | undefined,
    clientId: string | null
) {
    // Guard against invalid inputKey
    if (!inputKey || typeof inputKey !== "string" || !inputKey.includes("-")) {
        return false;
    }
    const inputKeyId = inputKey.split("-")[1];
    let storedKey: string | undefined;

    try {
        if (!clientId) {
            // For package source, fetch any matching key (assuming keyId is unique)
            const key = await db
                .select({ key: apiKeys.key })
                .from(apiKeys)
                .where(eq(apiKeys.keyId, inputKeyId))
                .limit(1);
            storedKey = key[0]?.key;
        } else {
            // For client-specific validation
            const key = await db
                .select({ key: apiKeys.key })
                .from(apiKeys)
                .where(eq(apiKeys.id, clientId))
                .limit(1);
            storedKey = key[0]?.key;
        }
        if (!storedKey) {
            return false;
        }
        if (inputKey !== storedKey) {
            return false;
        }
        return true;
    } catch (error) {
        console.error("Error in validateApiKey:", error);
        return false;
    }
}

export const getClientFromKey = async (key: string) => {
    const keyId = key.split("-")[1];
    const keyRecord = await db
        .select({ id: apiKeys.id })
        .from(apiKeys)
        .where(eq(apiKeys.keyId, keyId));
    if (!keyRecord[0]) {
        return null;
    }
    return keyRecord[0].id;
};

export const getApiKeyFromId = async (cid: string) => {
    return db
        .select({ key: apiKeys.key, created_at: apiKeys.createdAt })
        .from(apiKeys)
        .where(eq(apiKeys.id, cid))
        .then((key) => {
            if (!key[0]) {
                return null;
            }
            return key[0];
        });
};
