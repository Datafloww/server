import { NextFunction, Request, Response } from "express";
import { db } from "../db/index";
import {
    events,
    sessions,
    users,
    InsertEvent,
    InsertSession,
    InsertUser,
} from "../db/schema/analytics";
import { eq } from "drizzle-orm";
import { getClientIp } from "../services/geolocation.js";
import { getClientFromKey } from "../modules/key.js";

/**
 * Helper function to ensure a user exists in the database
 */
async function ensureUserExists(
    clientId: string,
    userId: string,
    anonId?: string
): Promise<string | null> {
    const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.userId, userId))
        .limit(1);

    if (existingUser.length > 0) {
        return existingUser[0].userId;
    }

    const newUser: InsertUser = {
        clientId,
        userId,
        anonId: anonId || null,
        createdAt: new Date(),
    };
    const [insertedUser] = await db.insert(users).values(newUser).returning();
    return insertedUser.userId;
}

/**
 * Handles analytics event ingestion from client-side tracking
 */
export const IngestEvent = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const {
            event,
            type,
            writeKey,
            sessionId: providedSessionId,
            userId,
            anonId,
            timestamp,
            url,
            path,
            hostname,
            referrer,
            userAgent,
            language,
            screenSize,
            viewportSize,
            geo,
            properties,
            duration,
            connection,
            scrollDepth,
            payload,
            meta,
        } = req.body;

        // Basic validation
        if (!event || !type) {
            return res.status(400).json({
                error: "Missing required fields: event and type are required",
            });
        }

        const clientId = await getClientFromKey(writeKey);
        if (!clientId) {
            return res.status(401).json({ error: "Invalid API key" });
        }

        const clientIp = getClientIp(req);
        const requestUserAgent = req.headers["user-agent"] || userAgent;
        const geoData = geo || {};
        const effectiveAnonId = anonId || null;
        const deviceInfo = extractDeviceInfo(requestUserAgent);

        const standardizedProperties = {
            ...(properties || {}),
            ...(payload || {}),
            geo: geoData,
            meta: meta || {},
            url,
            path,
            hostname,
            referrer,
            language,
            screenSize,
            viewportSize,
            connection,
            duration,
            scrollDepth,
        };

        // Ensure user exists if userId is provided
        let userDbId: string | null = null;
        if (userId) {
            userDbId = await ensureUserExists(
                clientId,
                userId,
                effectiveAnonId
            );
        }

        // Generate or use provided sessionId
        const sessionId = providedSessionId || crypto.randomUUID();

        // Ensure session exists before event insertion
        await updateOrCreateSession(
            sessionId,
            clientId, // Use clientId from key
            userDbId,
            effectiveAnonId,
            event,
            type,
            path,
            referrer,
            requestUserAgent,
            deviceInfo
        );

        // Prepare event data for insertion
        const eventData: InsertEvent = {
            clientId,
            userId: userDbId || null,
            anonId: effectiveAnonId,
            sessionId, // Now guaranteed to exist in sessions
            eventName: event,
            eventType: type,
            url,
            path,
            referrer,
            userAgent: requestUserAgent,
            browser: deviceInfo.browser,
            os: deviceInfo.os,
            deviceType: deviceInfo.deviceType,
            clientIp,
            properties: standardizedProperties,
            createdAt: timestamp ? new Date(timestamp) : new Date(),
        };

        // Insert the event
        const [newEvent] = await db
            .insert(events)
            .values(eventData)
            .returning();

        next();
        // return res.status(200).json({
        //     success: true,
        //     eventId: newEvent.id,
        // });
    } catch (error) {
        console.error("Error tracking event:", error);
        return res.status(500).json({
            error: "Failed to track event",
            message: error instanceof Error ? error.message : "Unknown error",
        });
    }
};

/**
 * Update existing session or create a new one
 */
async function updateOrCreateSession(
    sessionId: string,
    clientId: string,
    userId: string | null,
    anonId: string | null,
    eventName: string,
    eventType: string,
    path: string | null,
    referrer: string | null,
    userAgent: string | null,
    deviceInfo: any
) {
    const now = new Date();

    try {
        const existingSession = await db
            .select()
            .from(sessions)
            .where(eq(sessions.id, sessionId))
            .limit(1);

        if (existingSession.length > 0) {
            const session = existingSession[0];
            const firstSeen = new Date(session.firstSeen);
            const duration = Math.floor(
                (now.getTime() - firstSeen.getTime()) / 1000
            );

            const pageViews = isPageViewEvent(eventName, eventType)
                ? (session.pageViews || 0) + 1
                : session.pageViews;

            const interactions = isInteractionEvent(eventType)
                ? (session.interactions || 0) + 1
                : session.interactions;

            await db
                .update(sessions)
                .set({
                    lastSeen: now,
                    duration,
                    pageViews,
                    interactions,
                    exitPage: path || session.exitPage,
                    active: true,
                    userId: userId || session.userId,
                })
                .where(eq(sessions.id, sessionId));
        } else {
            const sessionData: InsertSession = {
                id: sessionId,
                clientId,
                userId,
                anonId,
                firstSeen: now,
                lastSeen: now,
                duration: 0,
                pageViews: isPageViewEvent(eventName, eventType) ? 1 : 0,
                interactions: isInteractionEvent(eventType) ? 1 : 0,
                referrer,
                entryPage: path || null,
                exitPage: path || null,
                userAgent,
                deviceInfo: {
                    ...deviceInfo,
                    initialTimestamp: now.toISOString(),
                },
                active: true,
            };

            await db.insert(sessions).values(sessionData);
        }
    } catch (error) {
        console.error("Error updating session:", error);
        throw error; // Propagate error to catch in IngestEvent
    }
}

/**
 * Check if an event is a page view event
 */
function isPageViewEvent(eventName: string, eventType: string): boolean {
    return (
        eventType === "page" ||
        eventName === "Page Viewed" ||
        eventName === "pageview" ||
        eventName.includes("Route Changed")
    );
}

/**
 * Check if an event is an interaction event
 */
function isInteractionEvent(eventType: string): boolean {
    return (
        eventType === "interaction" ||
        eventType === "track" ||
        eventType === "engagement"
    );
}

/**
 * Extract browser, OS, and device type from user agent
 */
function extractDeviceInfo(userAgent: string | null): {
    browser: string | null;
    os: string | null;
    deviceType: string | null;
} {
    if (!userAgent) {
        return { browser: null, os: null, deviceType: null };
    }

    let browser: string | null = null;
    if (userAgent.includes("Chrome") && !userAgent.includes("Edg/"))
        browser = "Chrome";
    else if (userAgent.includes("Firefox")) browser = "Firefox";
    else if (userAgent.includes("Safari") && !userAgent.includes("Chrome"))
        browser = "Safari";
    else if (userAgent.includes("Edg/")) browser = "Edge";
    else if (userAgent.includes("OPR") || userAgent.includes("Opera"))
        browser = "Opera";
    else if (userAgent.includes("MSIE") || userAgent.includes("Trident/"))
        browser = "Internet Explorer";
    else browser = "Other";

    let os: string | null = null;
    if (userAgent.includes("Windows")) os = "Windows";
    else if (userAgent.includes("Mac OS")) os = "MacOS";
    else if (userAgent.includes("Android")) os = "Android";
    else if (
        userAgent.includes("iOS") ||
        userAgent.includes("iPhone") ||
        userAgent.includes("iPad")
    )
        os = "iOS";
    else if (userAgent.includes("Linux")) os = "Linux";
    else os = "Other";

    let deviceType: string | null = null;
    if (
        userAgent.includes("Mobile") ||
        (userAgent.includes("Android") && userAgent.includes("wv"))
    )
        deviceType = "Mobile";
    else if (userAgent.includes("iPad") || userAgent.includes("Tablet"))
        deviceType = "Tablet";
    else deviceType = "Desktop";

    return { browser, os, deviceType };
}
