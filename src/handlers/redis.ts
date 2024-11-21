import { Redis } from "@upstash/redis";
import dotenv from "dotenv";
dotenv.config();

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
export const validateWriteKey = async (
    key: string,
    userId: string
): Promise<boolean> => {
    try {
        if (!key || !userId) {
            console.error("Invalid key or userId provided");
            return false;
        }

        const storedKey = await redis.get(`write_key:${userId}`);
        if (!storedKey) {
            console.error(`No write key found in Redis for userId: ${userId}`);
            return false;
        }
        return String(storedKey).trim() == key.trim();
    } catch (error) {
        console.error("Error validating write key:", error);
        return false;
    }
};
