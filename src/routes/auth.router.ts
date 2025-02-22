import { Router } from "express";
import {
    checkIfUserExists,
    createClient,
    createApiKey,
    verifyApiKey,
} from "../handlers/auth.handler";
export const authRouter = Router();

authRouter.get("/client/check", checkIfUserExists);
authRouter.post("/client/create", createClient);

authRouter.get("/key/create", createApiKey);
authRouter.get("/key/verify", verifyApiKey);
