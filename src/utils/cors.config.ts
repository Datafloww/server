import { CorsOptions } from "cors";

// const allowedOrigins = ["*"];

const cors_config: CorsOptions = {
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
};

export default cors_config;
