import { Request } from "express";

/**
 * Extracts the client IP address from the request
 */
export function getClientIp(req: Request): string {
    // Check for IP from proxy headers first
    const forwardedFor = req.headers["x-forwarded-for"];

    if (forwardedFor) {
        // x-forwarded-for may return multiple IPs in the format: "client IP, proxy1 IP, proxy2 IP"
        const ips = Array.isArray(forwardedFor)
            ? forwardedFor[0]
            : forwardedFor.split(",")[0];

        return ips.trim();
    }

    // If no forwarded IP, use the direct connection IP
    return req.socket.remoteAddress || "127.0.0.1";
}
