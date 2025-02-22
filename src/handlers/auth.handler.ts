import { Request, Response } from "express";
import { user, query } from "../api/appwrite";
import { generateApiKey, validateApiKey } from "../modules/key";
import { db, clients } from "../db/index";

export const createClient = async (req: Request, res: Response) => {
    try {
        const response = await db.insert(clients).values({
            clientId: req.body.id,
            email: req.body.email,
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
        const response = await user.list([
            query.equal("email", req.body.email as string),
        ]);

        if (response.total === 0) {
            return res.status(404).json({ message: "User not found" });
        }
        const clientId = response.users[0].$id;
        const apiKey = await generateApiKey(clientId);
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
        const response = await user.list([
            query.equal("email", req.body.email as string),
        ]);
        if (response.total === 0) {
            return res.status(404).json({ message: "User not found" });
        }
        const clientId = response.users[0].$id;
        const isValid = await validateApiKey(
            clientId,
            req.body.apiKey as string
        );
        if (!isValid) {
            return res.status(401).json({ message: "Unauthorized" });
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
