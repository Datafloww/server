import { CorsOptions } from "cors";

// List of paths that should be accessible from any origin
const exemptPaths = [
    "/analytics/track",
    // add more paths as needed
];

const allowedOrigins = [
    "https://dash.datafloww.me",
    "http://dash.datafloww.me",
];

const cors_config: CorsOptions = {
    origin: (origin, callback) => {
        // Path-based logic is not available here; only origin-based checks are possible.
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
};

export default cors_config;
