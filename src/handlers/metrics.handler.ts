import { Request, Response } from "express";
import { db } from "../db/index.js";
import { events, sessions, users } from "../db/schema/analytics.js";
import { and, eq, sql, desc, gte, lte } from "drizzle-orm";
import { getClientFromKey } from "../modules/key.js";
import { validateApiKey } from "../modules/key.js";
import * as metricsCalculations from "../utils/metricsCalculations.js";
import { jsonb } from "drizzle-orm/pg-core";

// Helper to format date to SQL timestamp string
function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    const milliseconds = String(date.getMilliseconds()).padStart(3, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${milliseconds}`;
}

interface TimeRange {
    startDate: Date;
    endDate: Date;
    formattedStart: string;
    formattedEnd: string;
}

// Helper to parse date range from query params
function getTimeRange(start?: string, end?: string): TimeRange {
    const endDate = end ? new Date(end) : new Date();
    endDate.setHours(23, 59, 59, 999); // Set to end of day

    const startDate = start
        ? new Date(start)
        : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // Default 30 days
    startDate.setHours(0, 0, 0, 0); // Set to start of day

    return {
        startDate,
        endDate,
        formattedStart: formatDate(startDate),
        formattedEnd: formatDate(endDate),
    };
}

export const getOverviewMetrics = async (req: Request, res: Response) => {
    try {
        const { start, end } = req.query;
        const writeKey = req.headers["x-api-key"] as string;
        const clientId = await getClientFromKey(writeKey);

        if (!clientId) {
            return res.status(401).json({ error: "Invalid API key" });
        }

        const { startDate, endDate } = getTimeRange(
            start as string,
            end as string
        );

        // Get total users
        const totalUsers = await db
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .where(eq(users.clientId, clientId));

        // Get active sessions in period
        const activeSessions = await db
            .select({ count: sql<number>`count(*)` })
            .from(sessions)
            .where(
                and(
                    eq(sessions.clientId, clientId),
                    gte(sessions.firstSeen, startDate),
                    lte(sessions.firstSeen, endDate)
                )
            );

        // Get total pageviews in period
        const pageViews = await db
            .select({
                total: sql<number>`sum(page_views)`,
            })
            .from(sessions)
            .where(
                and(
                    eq(sessions.clientId, clientId),
                    gte(sessions.firstSeen, startDate),
                    lte(sessions.firstSeen, endDate)
                )
            );

        // Get average session duration
        const avgDuration = await db
            .select({
                avg: sql<number>`avg(duration)`,
            })
            .from(sessions)
            .where(
                and(
                    eq(sessions.clientId, clientId),
                    gte(sessions.firstSeen, startDate),
                    lte(sessions.firstSeen, endDate)
                )
            );

        return res.json({
            totalUsers: totalUsers[0].count,
            activeSessions: activeSessions[0].count,
            pageViews: pageViews[0].total || 0,
            avgSessionDuration: Math.round(avgDuration[0].avg || 0),
            timeRange: {
                start: getTimeRange(start as string, end as string)
                    .formattedStart,
                end: getTimeRange(start as string, end as string).formattedEnd,
            },
        });
    } catch (error) {
        console.error("Error fetching overview metrics:", error);
        return res.status(500).json({ error: "Failed to fetch metrics" });
    }
};

export const getTopPages = async (req: Request, res: Response) => {
    try {
        const { start, end, limit = "10" } = req.query;
        const writeKey = req.headers["x-api-key"] as string;
        const clientId = await getClientFromKey(writeKey);

        if (!clientId) {
            return res.status(401).json({ error: "Invalid API key" });
        }

        const { startDate, endDate } = getTimeRange(
            start as string,
            end as string
        );

        const topPages = await db
            .select({
                path: events.path,
                views: sql<number>`count(*)`,
            })
            .from(events)
            .where(
                and(
                    eq(events.clientId, clientId),
                    eq(events.eventType, "page"),
                    gte(events.createdAt, startDate),
                    lte(events.createdAt, endDate)
                )
            )
            .groupBy(events.path)
            .orderBy(desc(sql`count(*)`))
            .limit(Number(limit));

        return res.json(topPages);
    } catch (error) {
        console.error("Error fetching top pages:", error);
        return res.status(500).json({ error: "Failed to fetch top pages" });
    }
};

export const getUserBehavior = async (req: Request, res: Response) => {
    try {
        const { start, end } = req.query;
        const writeKey = req.headers["x-api-key"] as string;
        const clientId = await getClientFromKey(writeKey);

        if (!clientId) {
            return res.status(401).json({ error: "Invalid API key" });
        }

        const { startDate, endDate } = getTimeRange(
            start as string,
            end as string
        );

        // Get device distribution from events table
        const deviceDistribution = await db
            .select({
                deviceType: events.deviceType,
                count: sql<number>`count(distinct ${events.sessionId})`,
            })
            .from(events)
            .where(
                and(
                    eq(events.clientId, clientId),
                    gte(events.createdAt, startDate),
                    lte(events.createdAt, endDate)
                )
            )
            .groupBy(events.deviceType);

        // Get browser distribution
        const browserDistribution = await db
            .select({
                browser: events.browser,
                count: sql<number>`count(distinct ${events.sessionId})`,
            })
            .from(events)
            .where(
                and(
                    eq(events.clientId, clientId),
                    gte(events.createdAt, startDate),
                    lte(events.createdAt, endDate)
                )
            )
            .groupBy(events.browser);

        // Get user engagement levels
        const userEngagement = await db
            .select({
                engagementLevel: sql<string>`
                    CASE 
                        WHEN interactions >= 10 THEN 'High'
                        WHEN interactions >= 5 THEN 'Medium'
                        ELSE 'Low'
                    END
                `,
                count: sql<number>`count(*)`,
            })
            .from(sessions)
            .where(
                and(
                    eq(sessions.clientId, clientId),
                    gte(sessions.firstSeen, startDate),
                    lte(sessions.firstSeen, endDate)
                )
            ).groupBy(sql`
                CASE 
                    WHEN interactions >= 10 THEN 'High'
                    WHEN interactions >= 5 THEN 'Medium'
                    ELSE 'Low'
                END
            `);

        // Session Duration Analysis
        const sessionDuration = await db
            .select({
                durationRange: sql<string>`
                    CASE 
                        WHEN duration < 60 THEN '0-1 min'
                        WHEN duration < 300 THEN '1-5 min'
                        WHEN duration < 900 THEN '5-15 min'
                        WHEN duration < 1800 THEN '15-30 min'
                        ELSE '30+ min'
                    END
                `,
                count: sql<number>`count(*)`,
                avgDuration: sql<number>`avg(duration)`,
            })
            .from(sessions)
            .where(
                and(
                    eq(sessions.clientId, clientId),
                    gte(sessions.firstSeen, startDate),
                    lte(sessions.firstSeen, endDate)
                )
            ).groupBy(sql`
                CASE 
                    WHEN duration < 60 THEN '0-1 min'
                    WHEN duration < 300 THEN '1-5 min'
                    WHEN duration < 900 THEN '5-15 min'
                    WHEN duration < 1800 THEN '15-30 min'
                    ELSE '30+ min'
                END
            `);
        // Referrer Analysis
        const referrerAnalysis = await db
            .select({
                referrer: sql<string>`
                    CASE 
                        WHEN referrer IS NULL OR referrer = '' THEN 'Direct'
                        WHEN referrer LIKE '%google%' THEN 'Google'
                        WHEN referrer LIKE '%facebook%' THEN 'Facebook'
                        WHEN referrer LIKE '%twitter%' THEN 'Twitter'
                        WHEN referrer LIKE '%linkedin%' THEN 'LinkedIn'
                        ELSE 'Other'
                    END
                `,
                count: sql<number>`count(*)`,
            })
            .from(sessions)
            .where(
                and(
                    eq(sessions.clientId, clientId),
                    gte(sessions.firstSeen, startDate),
                    lte(sessions.firstSeen, endDate)
                )
            ).groupBy(sql`
                CASE 
                    WHEN referrer IS NULL OR referrer = '' THEN 'Direct'
                    WHEN referrer LIKE '%google%' THEN 'Google'
                    WHEN referrer LIKE '%facebook%' THEN 'Facebook'
                    WHEN referrer LIKE '%twitter%' THEN 'Twitter'
                    WHEN referrer LIKE '%linkedin%' THEN 'LinkedIn'
                    ELSE 'Other'
                END
            `);

        // Entry/Exit Page Analysis
        const entryPages = await db
            .select({
                page: sessions.entryPage,
                count: sql<number>`count(*)`,
            })
            .from(sessions)
            .where(
                and(
                    eq(sessions.clientId, clientId),
                    gte(sessions.firstSeen, startDate),
                    lte(sessions.firstSeen, endDate)
                )
            )
            .groupBy(sessions.entryPage)
            .orderBy(sql`count(*) DESC`)
            .limit(10);

        const exitPages = await db
            .select({
                page: sessions.exitPage,
                count: sql<number>`count(*)`,
            })
            .from(sessions)
            .where(
                and(
                    eq(sessions.clientId, clientId),
                    gte(sessions.firstSeen, startDate),
                    lte(sessions.firstSeen, endDate)
                )
            )
            .groupBy(sessions.exitPage)
            .orderBy(sql`count(*) DESC`)
            .limit(10);

        // Interaction Frequency Distribution
        const interactionFrequency = await db
            .select({
                frequency: sql<string>`
                    CASE 
                        WHEN interactions = 0 THEN 'No interactions'
                        WHEN interactions = 1 THEN 'Single interaction'
                        WHEN interactions <= 3 THEN '2-3 interactions'
                        WHEN interactions <= 5 THEN '4-5 interactions'
                        WHEN interactions <= 10 THEN '6-10 interactions'
                        ELSE 'More than 10 interactions'
                    END
                `,
                count: sql<number>`count(*)`,
                avgInteractions: sql<number>`avg(interactions)`,
            })
            .from(sessions)
            .where(
                and(
                    eq(sessions.clientId, clientId),
                    gte(sessions.firstSeen, startDate),
                    lte(sessions.firstSeen, endDate)
                )
            ).groupBy(sql`
                CASE 
                    WHEN interactions = 0 THEN 'No interactions'
                    WHEN interactions = 1 THEN 'Single interaction'
                    WHEN interactions <= 3 THEN '2-3 interactions'
                    WHEN interactions <= 5 THEN '4-5 interactions'
                    WHEN interactions <= 10 THEN '6-10 interactions'
                    ELSE 'More than 10 interactions'
                END
            `);

        // Entry Page Analysis

        const entryPageAnalysis = await db
            .select({
                page: sessions.entryPage,
                count: sql<number>`count(*)`,
                bounceRate: sql<number>`
                    ROUND(
                        (SUM(CASE WHEN interactions <= 1 THEN 1 ELSE 0 END)::numeric / 
                        COUNT(*)::numeric * 100)::numeric,
                        2
                    )
                `,
            })
            .from(sessions)
            .where(
                and(
                    eq(sessions.clientId, clientId),
                    gte(sessions.firstSeen, startDate),
                    lte(sessions.firstSeen, endDate)
                )
            )
            .groupBy(sessions.entryPage)
            .orderBy(sql`count(*) DESC`)
            .limit(10);

        // Exit Page Analysis
        const exitPageAnalysis = await db
            .select({
                page: sessions.exitPage,
                count: sql<number>`count(*)`,
                avgDuration: sql<number>`avg(${sessions.duration})`,
            })
            .from(sessions)
            .where(
                and(
                    eq(sessions.clientId, clientId),
                    gte(sessions.firstSeen, startDate),
                    lte(sessions.firstSeen, endDate)
                )
            )
            .groupBy(sessions.exitPage)
            .orderBy(sql`count(*) DESC`)
            .limit(10);

        // Geo Location Analysis
        const geoAnalysis = await db
            .select({
                country: sql<string>`(properties->'geo'->>'country')::text`,
                city: sql<string>`(properties->'geo'->>'city')::text`,
                count: sql<number>`count(*)`,
                avgLatitude: sql<number>`avg((properties->'geo'->>'latitude')::numeric)`,
                avgLongitude: sql<number>`avg((properties->'geo'->>'longitude')::numeric)`,
            })
            .from(events)
            .where(
                and(
                    eq(events.clientId, clientId),
                    gte(events.createdAt, startDate),
                    lte(events.createdAt, endDate)
                )
            )
            .groupBy(
                sql`(properties->'geo'->>'country')::text`,
                sql`(properties->'geo'->>'city')::text`
            )
            .orderBy(sql`count(*) DESC`)
            .limit(10);

        // Connection Analysis
        const connectionAnalysis = await db
            .select({
                effectiveType: sql<string>`(properties->'connection'->>'effectiveType')::text`,
                count: sql<number>`count(*)`,
                avgRtt: sql<number>`avg((properties->'connection'->>'rtt')::numeric)`,
                avgDownlink: sql<number>`avg((properties->'connection'->>'downlink')::numeric)`,
            })
            .from(events)
            .where(
                and(
                    eq(events.clientId, clientId),
                    gte(events.createdAt, startDate),
                    lte(events.createdAt, endDate)
                )
            )
            .groupBy(sql`(properties->'connection'->>'effectiveType')::text`)
            .orderBy(sql`count(*) DESC`);

        // Screen Size Analysis
        const screenSizeAnalysis = await db
            .select({
                screenSize: sql<string>`(properties->>'screenSize')::text`,
                count: sql<number>`count(*)`,
            })
            .from(events)
            .where(
                and(
                    eq(events.clientId, clientId),
                    gte(events.createdAt, startDate),
                    lte(events.createdAt, endDate)
                )
            )
            .groupBy(sql`(properties->>'screenSize')::text`)
            .orderBy(sql`count(*) DESC`)
            .limit(10);

        // Language Analysis
        const languageAnalysis = await db
            .select({
                language: sql<string>`(properties->>'language')::text`,
                count: sql<number>`count(*)`,
            })
            .from(events)
            .where(
                and(
                    eq(events.clientId, clientId),
                    gte(events.createdAt, startDate),
                    lte(events.createdAt, endDate)
                )
            )
            .groupBy(sql`(properties->>'language')::text`)
            .orderBy(sql`count(*) DESC`);

        return res.json({
            deviceDistribution,
            browserDistribution,
            userEngagement,
            sessionDuration,
            referrerAnalysis,
            entryPageAnalysis,
            exitPageAnalysis,
            entryPages,
            exitPages,
            interactionFrequency,
            geoAnalysis,
            connectionAnalysis,
            screenSizeAnalysis,
            languageAnalysis,
            timeRange: {
                start: getTimeRange(start as string, end as string)
                    .formattedStart,
                end: getTimeRange(start as string, end as string).formattedEnd,
            },
        });
    } catch (error) {
        console.error("Error fetching user behavior:", error);
        return res
            .status(500)
            .json({ error: "Failed to fetch user behavior data" });
    }
};

export const getRetentionMetrics = async (req: Request, res: Response) => {
    try {
        const { start, end } = req.query;
        const writeKey = req.headers["x-api-key"] as string;
        const clientId = await getClientFromKey(writeKey);

        if (!clientId) {
            return res.status(401).json({ error: "Invalid API key" });
        }

        const { startDate, endDate } = getTimeRange(
            start as string,
            end as string
        );

        // Get returning vs new users
        const userTypes = await db
            .select({
                userId: users.userId,
                firstSeen: sql<Date>`min(${sessions.firstSeen})`,
                visitCount: sql<number>`count(*)`,
            })
            .from(sessions)
            .leftJoin(users, eq(sessions.userId, users.userId))
            .where(
                and(
                    eq(sessions.clientId, clientId),
                    gte(sessions.firstSeen, startDate),
                    lte(sessions.firstSeen, endDate)
                )
            )
            .groupBy(users.userId);

        const returnRate = userTypes.reduce(
            (acc, user) => {
                if (user.visitCount > 1) acc.returning++;
                else acc.new++;
                return acc;
            },
            { returning: 0, new: 0 }
        );

        return res.json({
            returnRate,
            timeRange: {
                start: getTimeRange(start as string, end as string)
                    .formattedStart,
                end: getTimeRange(start as string, end as string).formattedEnd,
            },
        });
    } catch (error) {
        console.error("Error fetching retention metrics:", error);
        return res
            .status(500)
            .json({ error: "Failed to fetch retention metrics" });
    }
};

export async function getBusinessMetrics(req: Request, res: Response) {
    try {
        const { start, end, businessType } = req.query;

        if (!start || !end || !businessType) {
            return res
                .status(400)
                .json({ error: "Missing required parameters" });
        }

        const apiKey = req.headers["x-api-key"] as string;
        if (!apiKey) {
            return res.status(401).json({ error: "API key is required" });
        }

        const clientId = await getClientFromKey(apiKey);
        if (!clientId) {
            return res.status(401).json({ error: "Invalid API key" });
        }

        const isValid = await validateApiKey(apiKey, clientId);
        if (!isValid) {
            return res.status(401).json({ error: "Invalid API key" });
        }

        const { startDate, endDate } = getTimeRange(
            start as string,
            end as string
        );

        // Get all metrics for the time period
        const metrics = await db
            .select({
                eventType: events.eventType,
                count: sql<number>`count(*)`,
                properties: sql<typeof jsonb>`jsonb_agg(properties)`,
            })
            .from(events)
            .where(
                and(
                    eq(events.clientId, clientId),
                    gte(events.createdAt, startDate),
                    lte(events.createdAt, endDate)
                )
            )
            .groupBy(events.eventType);

        // Get common metrics
        const commonMetrics = {
            totalSessions: await metricsCalculations.getTotalSessions(
                clientId,
                start as string,
                end as string
            ),
            uniqueVisitors: await metricsCalculations.getUniqueVisitors(
                clientId,
                start as string,
                end as string
            ),
            averageSessionDuration:
                await metricsCalculations.getAverageSessionDuration(
                    clientId,
                    start as string,
                    end as string
                ),
            bounceRate: await metricsCalculations.getBounceRate(
                clientId,
                start as string,
                end as string
            ),
        };

        // Get business-specific metrics
        let businessMetrics = {};
        switch (businessType) {
            case "ecommerce":
                businessMetrics = {
                    topProducts: metricsCalculations.getTopProducts(metrics),
                    salesByCategory:
                        metricsCalculations.getSalesByCategory(metrics),
                    purchaseFunnel:
                        metricsCalculations.analyzePurchaseFunnel(metrics),
                };
                break;
            case "blog":
                businessMetrics = {
                    averageReadTime:
                        metricsCalculations.calculateAverageReadTime(metrics),
                    popularArticles:
                        metricsCalculations.getPopularArticles(metrics),
                    engagementRate:
                        metricsCalculations.calculateEngagementRate(metrics),
                };
                break;
            case "saas":
                businessMetrics = {
                    userRetention:
                        metricsCalculations.calculateUserRetention(metrics),
                    featureAdoption:
                        metricsCalculations.analyzeFeatureAdoption(metrics),
                    churnRate: metricsCalculations.calculateChurnRate(metrics),
                    mrr: metricsCalculations.calculateMonthlyRecurringRevenue(
                        metrics
                    ),
                    activeUsers: metricsCalculations.getActiveUsers(metrics),
                };
                break;
            default:
                businessMetrics = {
                    eventDistribution:
                        metricsCalculations.getEventDistribution(metrics),
                    userJourneys:
                        metricsCalculations.analyzeUserJourney(metrics),
                    customEvents: metricsCalculations.getCustomEvents(metrics),
                };
        }

        res.json({
            timeRange: { start, end },
            businessType,
            commonMetrics,
            businessMetrics,
        });
    } catch (error) {
        console.error("Error fetching business metrics:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}

// Helper functions for metric calculations
function calculateConversionRate(metrics) {
    // Implementation for conversion rate calculation
}

function calculateAverageOrderValue(metrics) {
    // Implementation for AOV calculation
}

function calculateCartAbandonmentRate(metrics) {
    // Implementation for cart abandonment calculation
}

// ... add more helper functions as needed ...
