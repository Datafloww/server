import express from "express";
import cors from "cors";
import "dotenv/config";
import { authRouter } from "./routes/auth.router.js";
import { analyticsRouter } from "./routes/analytics.router.js";
import { TransformPayload } from "./middlewares/analytics.middleware.js";
import { IngestEvent } from "./handlers/analytics.handler.js";

const TOKEN = process.env.HEADER_AUTH_TOKEN;

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cors());

app.use("/auth", authRouter);
app.use("/analytics", analyticsRouter);

app.get("/", (req, res) => {
    if (req.headers.authorization !== `Bearer ${TOKEN}`) {
        return res.status(403).send("Forbidden");
    }
    res.redirect("/healthcheck");
});

app.post("/", TransformPayload(), IngestEvent);

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
