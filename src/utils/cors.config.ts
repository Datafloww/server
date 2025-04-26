import { CorsOptions } from "cors";

const allowedOrigins = [
    "https://dash.datafloww.me",
    "http://dash.datafloww.me",
];

const cors_config: CorsOptions = {
    origin: (origin, callback) => {
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
