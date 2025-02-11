import { Router } from "express";
import { checkIfUserExists } from "../handlers/user.handler.js";
export const authRouter = Router();

authRouter.get("/check", checkIfUserExists);
