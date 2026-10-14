import { Router } from "express";
import { getDashboardStats } from "../controllers/dashboard.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = Router();

// ─── Authenticated Owner Dashboard Aggregations ──────────────────────────────
router.get("/stats", requireAuth, getDashboardStats);

export default router;
