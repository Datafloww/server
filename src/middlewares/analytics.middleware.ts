import { Request, Response, NextFunction } from "express";

export const TransformPayload = () => {
    return (req: Request, res: Response, next: NextFunction) => {
        if ("data" in req.body && "payload" in req.body.data) {
            const { payload } = req.body.data;
            req.body = {
                event: payload.type === "identify" ? "Identify" : payload.event,
                type: payload.type === "trackEnd" ? "track" : payload.type,
                writeKey: req.body.writeKey,
                sessionId: payload.sessionId,
                userId: payload.userId || null,
                anonId: payload.anonymousId,
                properties: {
                    ...payload.properties,
                    traits: payload.traits || {},
                    meta: payload.meta || {}, // Nest npm-specific fields
                    config: req.body.config || {},
                },
            };
        }
        next();
        // If not npm payload, leave as-is for script
    };
};
