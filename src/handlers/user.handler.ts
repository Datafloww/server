import { user, query } from "../api/appwrite.js";
import { Request, Response } from "express";

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
