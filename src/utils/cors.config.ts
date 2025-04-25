import { CorsOptions } from "cors";

const cors_config: CorsOptions = {
    origin: ["https://dash.datafloww.me", "http://dash.datafloww.me"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
};

export default cors_config;
