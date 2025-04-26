import { Request, Response, NextFunction } from "express";

const exemptPaths = [
    "/analytics/track",
    // add more paths as needed
];

export function corsPathExempt(
    req: Request,
    res: Response,
    next: NextFunction
) {
    if (exemptPaths.includes(req.path)) {
        // @ts-ignore
        req.allowAllOrigins = true;
    }
    next();
}
