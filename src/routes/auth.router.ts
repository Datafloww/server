import { Router } from "express";
import {
    createUser,
    loginUser,
    verifyEmail,
} from "../handlers/user.handler.js";
export const authRouter = Router();

authRouter.post("/signup", createUser);
authRouter.post("/login", loginUser);
authRouter.get("/verify-email", verifyEmail);
