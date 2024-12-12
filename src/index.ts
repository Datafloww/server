import * as dotenv from "dotenv";
dotenv.config();
const PORT = process.env.PORT || 3000;
import app from "./server.js";

app.listen(PORT, () => {
    console.log(`[server]: Listening on http://api.localhost:${PORT}`);
});
