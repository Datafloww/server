import { Request, Response, NextFunction } from "express";

const TOKEN = process.env.HEADER_AUTH_TOKEN;

const exemptPaths = [
    "/",
    "/healthcheck",
    "/analytics/v1",
    "/analytics/track",
    "/auth/key/verify",
];

const exemptPathPatterns = [
    /^\/analytics\/v1\/[^/]+\/analytics\.min\.js$/, // Matches /analytics/v1/:key/analytics.min.js
];

export function BearerAuth(req: Request, res: Response, next: NextFunction) {
    // Normalize the path to handle trailing slashes
    const path = req.path.endsWith("/")
        ? req.path.slice(0, -1) || "/"
        : req.path;

    if (exemptPaths.includes(path)) {
        return next();
    }

    if (exemptPathPatterns.some((pattern) => pattern.test(path))) {
        return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || authHeader !== `Bearer ${TOKEN}`) {
        return res
            .status(403)
            .json({ message: "Forbidden: Invalid or missing token" });
    }
    next();
}
