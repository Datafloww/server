import { db } from "../db/index.js";
import { sessions } from "../db/schema/analytics.js";
import { and, eq, sql, gte, lte } from "drizzle-orm";

// E-commerce calculations
export function getTopProducts(metrics) {
    return metrics
        .filter(m => m.eventType === 'purchase')
        .map(m => ({
            productId: m.properties.productId,
            name: m.properties.productName,
            sales: m.count,
            revenue: m.properties.price * m.count
        }))
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 10);
}

export function getSalesByCategory(metrics) {
    return metrics
        .filter(m => m.eventType === 'purchase')
        .reduce((acc, m) => {
            const category = m.properties.category;
            acc[category] = (acc[category] || 0) + (m.properties.price * m.count);
            return acc;
        }, {});
}

export function analyzePurchaseFunnel(metrics) {
    const funnel = {
        viewProduct: metrics.find(m => m.eventType === 'view_product')?.count || 0,
        addToCart: metrics.find(m => m.eventType === 'add_to_cart')?.count || 0,
        checkout: metrics.find(m => m.eventType === 'checkout')?.count || 0,
        purchase: metrics.find(m => m.eventType === 'purchase')?.count || 0
    };

    return {
        ...funnel,
        conversionRates: {
            viewToCart: (funnel.addToCart / funnel.viewProduct) * 100,
            cartToCheckout: (funnel.checkout / funnel.addToCart) * 100,
            checkoutToPurchase: (funnel.purchase / funnel.checkout) * 100
        }
    };
}

// Blog calculations
export function calculateAverageReadTime(metrics) {
    const readEvents = metrics.filter(m => m.eventType === 'read_article');
    const totalReadTime = readEvents.reduce((sum, m) => sum + (m.properties.readTime || 0), 0);
    return totalReadTime / readEvents.length;
}

export function getPopularArticles(metrics) {
    return metrics
        .filter(m => m.eventType === 'read_article')
        .map(m => ({
            articleId: m.properties.articleId,
            title: m.properties.title,
            reads: m.count,
            averageReadTime: m.properties.readTime
        }))
        .sort((a, b) => b.reads - a.reads)
        .slice(0, 10);
}

export function calculateEngagementRate(metrics) {
    const totalReaders = metrics.find(m => m.eventType === 'read_article')?.count || 0;
    const totalEngagers = metrics
        .filter(m => ['share_article', 'comment'].includes(m.eventType))
        .reduce((sum, m) => sum + m.count, 0);
    
    return (totalEngagers / totalReaders) * 100;
}

// SaaS calculations
export function calculateUserRetention(metrics) {
    const signups = metrics.find(m => m.eventType === 'signup')?.count || 0;
    const activeUsers = metrics
        .filter(m => m.eventType === 'login')
        .reduce((unique, m) => unique.add(m.properties.userId), new Set())
        .size;
    
    return (activeUsers / signups) * 100;
}

export function analyzeFeatureAdoption(metrics) {
    return metrics
        .filter(m => m.eventType === 'feature_usage')
        .map(m => ({
            feature: m.properties.featureName,
            users: m.count,
            usageFrequency: m.properties.usageCount / m.count
        }))
        .sort((a, b) => b.users - a.users);
}

export function calculateChurnRate(metrics) {
    const totalUsers = metrics.find(m => m.eventType === 'signup')?.count || 0;
    const churnedUsers = metrics.find(m => m.eventType === 'cancel_subscription')?.count || 0;
    
    return (churnedUsers / totalUsers) * 100;
}

export function calculateMonthlyRecurringRevenue(metrics) {
    return metrics
        .filter(m => m.eventType === 'subscription')
        .reduce((sum, m) => sum + (m.properties.amount || 0), 0);
}

export function getActiveUsers(metrics) {
    return metrics
        .filter(m => m.eventType === 'login')
        .reduce((unique, m) => unique.add(m.properties.userId), new Set())
        .size;
}

// General calculations
export function getEventDistribution(metrics) {
    return metrics.reduce((acc, m) => {
        acc[m.eventType] = (acc[m.eventType] || 0) + m.count;
        return acc;
    }, {});
}

export function analyzeUserJourney(metrics) {
    const journeys = metrics.reduce((acc, m) => {
        const sessionId = m.properties.sessionId;
        if (!acc[sessionId]) {
            acc[sessionId] = [];
        }
        acc[sessionId].push({
            event: m.eventType,
            timestamp: m.properties.timestamp
        });
        return acc;
    }, {});

    return (Object.values(journeys) as {event: string, timestamp: string}[][])
        .map(journey => 
            journey.sort((a, b) => 
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            )
        )
        .slice(0, 10);
}

export function getCustomEvents(metrics) {
    return metrics
        .filter(m => !['pageview', 'click', 'scroll'].includes(m.eventType))
        .map(m => ({
            event: m.eventType,
            count: m.count,
            properties: m.properties
        }))
        .sort((a, b) => b.count - a.count);
}

// Common metrics calculations
export async function getTotalSessions(clientId: string, start: string, end: string) {
    const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(sessions)
        .where(
            and(
                eq(sessions.clientId, clientId),
                gte(sessions.firstSeen, new Date(start)),
                lte(sessions.firstSeen, new Date(end))
            )
        );
    return result[0]?.count || 0;
}

export async function getUniqueVisitors(clientId: string, start: string, end: string) {
    const result = await db
        .select({ count: sql<number>`count(distinct ${sessions.userId})` })
        .from(sessions)
        .where(
            and(
                eq(sessions.clientId, clientId),
                gte(sessions.firstSeen, new Date(start)),
                lte(sessions.firstSeen, new Date(end))
            )
        );
    return result[0]?.count || 0;
}

export async function getAverageSessionDuration(clientId: string, start: string, end: string) {
    const result = await db
        .select({ avg: sql<number>`avg(${sessions.duration})` })
        .from(sessions)
        .where(
            and(
                eq(sessions.clientId, clientId),
                gte(sessions.firstSeen, new Date(start)),
                lte(sessions.firstSeen, new Date(end))
            )
        );
    return Math.round(result[0]?.avg || 0);
}

export async function getBounceRate(clientId: string, start: string, end: string) {
    const totalSessions = await getTotalSessions(clientId, start, end);
    if (totalSessions === 0) return 0;

    const bouncedSessions = await db
        .select({ count: sql<number>`count(*)` })
        .from(sessions)
        .where(
            and(
                eq(sessions.clientId, clientId),
                gte(sessions.firstSeen, new Date(start)),
                lte(sessions.firstSeen, new Date(end)),
                eq(sessions.pageViews, 1)
            )
        );
    
    return Math.round((bouncedSessions[0]?.count || 0) / totalSessions * 100);
} 