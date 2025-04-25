import { CorsOptions } from "cors";

const cors_config: CorsOptions = {
    origin: ["https://dash.datafloww.me", "http://dash.datafloww.me"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Client-Version",
        "X-Analytics-Source",
    ],
};

export default cors_config;
