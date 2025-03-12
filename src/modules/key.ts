import { randomBytes } from "crypto";
import bcrypt from "bcrypt";
import { db, apiKeys } from "../db/index";
import { eq } from "drizzle-orm";

export async function generateApiKey(clientId: string) {
    const keyId = crypto.randomUUID().split("-")[0];
    const rawKey = randomBytes(4).toString("hex");
    const hashedKey = (await bcrypt.hash(rawKey, 10)).concat(`-${keyId}`);
    await db
        .update(apiKeys)
        .set({ keyHash: hashedKey })
        .where(eq(apiKeys.id, clientId));
    return rawKey.concat(`-${keyId}`);
}

export async function validateApiKey(
    inputKey: string | null | undefined,
    clientId: string | null
): Promise<boolean> {
    // Guard against invalid inputKey
    if (!inputKey || typeof inputKey !== "string" || !inputKey.includes("-")) {
        return false;
    }

    let storedHash: string | undefined;

    try {
        // Split inputKey into parts
        const [inputPrefix, inputKeyId] = inputKey.split("-");
        if (!inputPrefix || !inputKeyId) {
            return false;
        }

        // Fetch the stored hash
        if (!clientId) {
            // For package source, fetch any matching key (assuming keyId is unique)
            const key = await db
                .select({ hash: apiKeys.keyHash, keyId: apiKeys.keyId })
                .from(apiKeys)
                .where(eq(apiKeys.keyId, inputKeyId))
                .limit(1);
            storedHash = key[0]?.hash;
        } else {
            // For client-specific validation
            const key = await db
                .select({ hash: apiKeys.keyHash, keyId: apiKeys.keyId })
                .from(apiKeys)
                .where(eq(apiKeys.id, clientId))
                .limit(1);
            storedHash = key[0]?.hash;
        }

        // Guard against missing or invalid storedHash
        if (
            !storedHash ||
            typeof storedHash !== "string" ||
            !storedHash.includes("-")
        ) {
            return false;
        }

        // Split storedHash into parts
        const [storedPrefix, storedKeyId] = storedHash.split("-");
        if (!storedPrefix || !storedKeyId) {
            return false;
        }

        // Compare keyId parts
        if (storedKeyId !== inputKeyId) {
            return false;
        }

        // Compare hashed prefix
        const isPrefixValid = await bcrypt.compare(inputPrefix, storedPrefix);
        if (!isPrefixValid) {
            return false;
        }

        return isPrefixValid;
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
        throw new Error("Key not found");
    }
    return keyRecord[0].id;
};
