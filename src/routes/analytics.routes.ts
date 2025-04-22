import { Router } from "express";
import {
    getOverviewMetrics,
    getTopPages,
    getUserBehavior,
    getRetentionMetrics,
} from "../handlers/metrics.handler.js";

const router = Router();

// Analytics Dashboard Route
router.get("/overview", getOverviewMetrics);
router.get("/top-pages", getTopPages);
router.get("/user-behavior", getUserBehavior);
router.get("/retention", getRetentionMetrics);

export default router;
