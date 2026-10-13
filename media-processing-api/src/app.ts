import express from "express";
import compression from "compression";
import cors from "cors";
import { serve } from "inngest/express";

import mediaRoutes from "./routes/media.routes.js";
import globalErrorHandler from "./middlewares/error.handler.js";
import setupSwagger from "./utils/swagger.ui.js";
import { inngestClient } from "./inngest/client.js";
import { functions } from "./inngest/index.js";
import { supabase } from "./utils/supabase.js";
import { SUPABASE_BUCKET } from "./config/constants.js";
import { register, httpRequestDurationMicroseconds, httpRequestsTotal } from "./utils/metrics.js";

import type { Express, Request, Response } from "express";

function createApp() {
  const app: Express = express();
  app.use(express.json());

  // Prometheus HTTP metrics instrumentation middleware
  app.use((req: Request, res: Response, next) => {
    const start = process.hrtime();

    res.on("finish", () => {
      const diff = process.hrtime(start);
      const durationSeconds = diff[0] + diff[1] / 1e9;
      const route = req.route?.path || req.path || "unknown";

      httpRequestsTotal.inc({
        method: req.method,
        route,
        status_code: res.statusCode.toString(),
      });

      httpRequestDurationMicroseconds.observe(
        {
          method: req.method,
          route,
          status_code: res.statusCode.toString(),
        },
        durationSeconds,
      );
    });

    next();
  });

  app.use(compression());

  // CORS — restrict in production via ALLOWED_ORIGINS env var
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",");
  app.use(
    cors(
      allowedOrigins
        ? { origin: allowedOrigins, credentials: true }
        : undefined,
    ),
  );

  // ─── Health & Readiness Probes ────────────────────────────────
  /**
   * Liveness Probe: Quick check if Node process is alive.
   */
  app.get("/health", (req: Request, res: Response) => {
    res.status(200).json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  /**
   * Readiness Probe: Deep check verifying Supabase DB and Storage bucket reachability.
   */
  app.get("/ready", async (req: Request, res: Response) => {
    try {
      // 1. Verify Database connectivity
      const { error: dbError } = await supabase
        .from("media_jobs")
        .select("id")
        .limit(1);

      // 2. Verify Storage bucket access
      const { error: storageError } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .list("", { limit: 1 });

      if (dbError || storageError) {
        return res.status(503).json({
          status: "unhealthy",
          checks: {
            database: dbError ? `Failed: ${dbError.message}` : "healthy",
            storage: storageError ? `Failed: ${storageError.message}` : "healthy",
          },
          timestamp: new Date().toISOString(),
        });
      }

      return res.status(200).json({
        status: "ready",
        checks: {
          database: "healthy",
          storage: "healthy",
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return res.status(503).json({
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // ─── Prometheus Metrics Endpoint ──────────────────────────────
  app.get("/metrics", async (req: Request, res: Response) => {
    try {
      res.setHeader("Content-Type", register.contentType);
      const metrics = await register.metrics();
      res.end(metrics);
    } catch (err) {
      res.status(500).end(err instanceof Error ? err.message : "Metrics error");
    }
  });

  // ─── API Documentation ────────────────────────────────────────
  setupSwagger(app);

  // ─── API Routes ───────────────────────────────────────────────
  app.use("/api/media", mediaRoutes);

  // ─── Inngest Webhook Endpoint ─────────────────────────────────
  app.use(
    "/api/inngest",
    serve({ client: inngestClient, functions }),
  );

  // ─── 404 Catch-All (MUST be after all routes) ─────────────────
  app.all(
    /.*/,
    (
      req: Request,
      res: Response<{ status: string; message: string }>,
    ): void => {
      res.status(404).json({
        status: "fail",
        message: `${req.originalUrl} Does Not Exist.`,
      });
    },
  );

  app.use(globalErrorHandler);
  return app;
}

export default createApp;
