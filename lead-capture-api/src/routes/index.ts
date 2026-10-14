import { Router } from "express";
import healthRoutes from "./health.routes.js";
import authRoutes from "./auth.routes.js";
import widgetRoutes from "./widget.routes.js";
import submissionRoutes from "./submission.routes.js";
import dashboardRoutes from "./dashboard.routes.js";
import storageRoutes from "./storage.routes.js";
import { getCsrfTokenHandler } from "../middlewares/csrf.middleware.js";

const router = Router();

// Root health checks mounted directly
router.use("/", healthRoutes);

// CSRF token acquisition endpoint (GET - safe from CSRF)
router.get("/api/csrf-token", getCsrfTokenHandler);

// Capstone Feature Routes
router.use("/api/auth", authRoutes);
router.use("/api/widgets", widgetRoutes);
router.use("/api/submissions", submissionRoutes);
router.use("/api/dashboard", dashboardRoutes);
router.use("/api/storage", storageRoutes);

export default router;
