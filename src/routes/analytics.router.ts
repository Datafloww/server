import { Router } from "express";
import { validateApiKey } from "../modules/key.js";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { IngestEvent } from "../handlers/analytics.handler.js";
import { TransformPayload } from "../middlewares/analytics.middleware.js";

export const analyticsRouter = Router();

const __dirname = dirname(fileURLToPath(import.meta.url));
const parentDir = resolve(__dirname, "..");

analyticsRouter.get("/v1/:key/analytics.min.js", async (req, res) => {
    try {
        const key = req.params.key;

        if (!key) {
            console.error("Invalid key provided");
            return false;
        }
        const filePath = join(parentDir, "../public/analytics.min.js");
        const isValid = await validateApiKey(req.params.key, null);

        if (!isValid) {
            return res.status(401).json({ message: "Invalid write key" });
        }

        res.status(200).sendFile(filePath);
    } catch (error) {
        console.error("Error in route handler:", error);
        res.status(500).json({ message: "Something went wrong" });
    }
});

analyticsRouter.post("/track", TransformPayload(), (req, res) => {
    IngestEvent(req, res, () => {
        res.status(200).json({ success: true, eventId: res.locals.eventId });
    });
});
//TODO: store events in databasiaie
