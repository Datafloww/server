import { Router } from "express";
import {
    checkIfUserExists,
    createClient,
    createApiKey,
    verifyApiKey,
    getApiKey,
} from "../handlers/auth.handler.js";
export const authRouter = Router();

authRouter.get("/client/check", checkIfUserExists);
authRouter.post("/client/create", createClient);

authRouter.get("/key/create", createApiKey);
authRouter.post("/key/verify", verifyApiKey);
authRouter.get("/key/get", getApiKey);
