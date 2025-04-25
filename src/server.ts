import express from "express";
import cors from "cors";
import cors_config from "./utils/cors.config.js";
import "dotenv/config";
import { authRouter } from "./routes/auth.router.js";
import { analyticsRouter } from "./routes/analytics.router.js";
import { BearerAuth } from "./middlewares/auth.middleware.js";

const TOKEN = process.env.HEADER_AUTH_TOKEN;

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cors(cors_config));

app.use(BearerAuth);

app.use("/auth", authRouter);
app.use("/analytics", analyticsRouter);

app.get("/", (req, res) => {
    res.redirect("/healthcheck");
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
    console.error("Error:", err);

    if (err.type === "input") {
        return res.status(400).json({
            success: false,
            error: "Invalid input",
            details: err.message || "The input provided is not valid.",
        });
    }

    // Handle other types of errors
    const statusCode = err.status || 500;
    const response: { success: boolean; error: any; stack?: string } = {
        success: false,
        error: err.message || "Internal Server Error",
    };

    // Include stack trace only in non-production environments
    if (process.env.NODE_ENV !== "production") {
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
});

export default app;
