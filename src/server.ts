import express from "express";
import cors from "cors";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateWriteKey } from "./handlers/redis";
import { authRouter } from "./routes/auth.router";

const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));
const parentDir = resolve(__dirname, "..");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cors());

app.get("/", (req, res) => {
    res.status(200).json({ message: "ok" });
});

app.use("/auth", authRouter);

app.get("/analytics/v1/:key/analytics.min.js", async (req, res) => {
    try {
        if (typeof req.query.userId !== "string") {
            return res.status(400).json({ error: "Invalid userId" });
        }

        const userId = req.query.userId;
        const key = req.params.key;

        if (!key || !userId) {
            console.error("Invalid key or userId provided");
            return false;
        }
        const filePath = join(parentDir, "public/analytics.min.js");
        const isValid = await validateWriteKey(req.params.key, userId);

        if (!isValid) {
            return res.status(404).json({ message: "Invalid write key" });
        }

        res.status(200).sendFile(filePath);
    } catch (error) {
        console.error("Error in route handler:", error);
        res.status(500).json({ message: "Something went wrong" });
    }
});

app.get("/healthcheck", (req, res) => {
    const health = {
        status: "healthy",
        uptime: process.uptime(),
        timestamp: Date.now(),
    };

    res.status(200).json(health);
});

app.use((err, req, res, next) => {
    if (err.type === "auth") {
        res.status(401).json({ message: "unauthorized" });
    } else if (err.type === "input") {
        res.status(400).json({ message: "invalid input" });
    } else {
        res.status(500).json({ message: err, stack: err.stack });
    }
});

export default app;
