import express from "express";
import compression from "compression";
import cors from "cors";
import { serve } from "inngest/express";

import mediaRoutes from "./routes/media.routes.js";
import globalErrorHandler from "./middlewares/error.handler.js";
import setupSwagger from "./utils/swagger.ui.js";
import { inngestClient } from "./inngest/client.js";
import { functions } from "./inngest/index.js";

import type { Express, Request, Response } from "express";

function createApp() {
  const app: Express = express();
  app.use(express.json());

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
