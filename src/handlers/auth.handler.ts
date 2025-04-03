import { Request, Response } from "express";
import { user, query } from "../api/appwrite.js";
import {
    generateApiKey,
    validateApiKey,
    getApiKeyFromId,
} from "../modules/key.js";
import { db, clients, apiKeys } from "../db/index.js";
import { eq } from "drizzle-orm";

export const createClient = async (req: Request, res: Response) => {
    try {
        await db
            .insert(clients)
            .values({
                clientId: req.body.id,
                email: req.body.email,
            })
            .then(() => {
                db.insert(apiKeys).values({
                    id: req.body.id,
                    keyHash: "",
                    keyId: "",
                    key: "",
                });
            });
        res.status(201).json({
            message: "ok",
        });
    } catch (error: any) {
        res.status(error.code || 500).json({
            message: error.response?.message || "Server error",
        });
    }
};
export const checkIfUserExists = async (req: Request, res: Response) => {
    try {
        const response = await user.list([
            query.equal("email", req.query.email as string),
        ]);

        if (response.total > 0) {
            return res.status(409).json({ message: "User already exists" });
        }
        res.status(200).json({
            message: "ok",
        });
    } catch (error: any) {
        res.status(error.code || 500).json({
            message: error.response?.message || "Server error",
        });
    }
};

export const createApiKey = async (req: Request, res: Response) => {
    try {
        const response = await db
            .select({ email: clients.email, cid: clients.clientId })
            .from(clients)
            .where(eq(clients.email, req.body.email as string));

        const user = response[0];

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const { cid } = user;

        const apiKey = await generateApiKey(cid);
        res.status(201).json({
            apiKey,
        });
    } catch (error: any) {
        res.status(error.code || 500).json({
            message: error.response?.message || "Server error",
        });
    }
};

export const verifyApiKey = async (req: Request, res: Response) => {
    try {
        const source = Array.isArray(req.headers["x-analytics-source"])
            ? req.headers["x-analytics-source"][0].toLowerCase()
            : req.headers["x-analytics-source"]?.toLowerCase();
        if (source === "package") {
            const isValid = await validateApiKey(
                req.body.apiKey as string,
                null
            );
            if (!isValid) {
                return res.status(401).json({ message: "Invalid API Key" });
            }
            return res
                .cookie("auth", req.body.apiKey as string, {
                    maxAge: 900000,
                    httpOnly: true,
                })
                .status(200)
                .json({ message: "ok" });
        }

        const response = await db
            .select({ email: clients.email, cid: clients.clientId })
            .from(clients)
            .where(eq(clients.email, req.body.email));

        const user = response[0];

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const { cid } = user;

        const isValid = await validateApiKey(req.body.apiKey as string, cid);
        if (!isValid) {
            return res.status(401).json({ message: "Invalid API Key" });
        }

        return res.status(200).json({ message: "ok" });
    } catch (error: any) {
        console.error("Verification error:", error);
        return res.status(error.code || 500).json({
            message: error.response?.message || "Server error",
        });
    }
};

export const getApiKey = async (req: Request, res: Response) => {
    const cid = req.query.client_id as string | undefined;
    if (!cid) {
        return res.status(400).json({ message: "client_id required" });
    }
    const key = await getApiKeyFromId(cid);
    return res.status(200).json({ data: key });
};
