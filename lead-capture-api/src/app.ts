import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import path from "node:path";
import routes from "./routes/index.js";
import errorHandler from "./middlewares/error.handler.js";
import { setupSwagger } from "./utils/swagger.js";
import { apiRateLimiter } from "./middlewares/rate-limit.middleware.js";
import { csrfProtection } from "./middlewares/csrf.middleware.js";
import { env } from "./config/env.js";

export function createApp(): Express {
  const app: Express = express();

  // ─── Security Headers (Helmet) ──────────────────────────────────────────────
  // Configured to permit cross-origin embed script loading & public form submissions
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: false, // Allows embedding on host sites
    })
  );

  // ─── Cross-Origin Resource Sharing (CORS) ───────────────────────────────────
  // Handles preflight (OPTIONS) automatically and allows embedding from any host
  app.use(
    cors({
      origin: (origin, callback) => {
        // Permit requests with no origin (curl, server-to-server) or any host origin
        callback(null, true);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "x-csrf-token",
        "x-requested-with",
        "x-forwarded-for",
      ],
      exposedHeaders: ["Cache-Control", "Content-Length"],
    })
  );

  // ─── Cookie Parser ──────────────────────────────────────────────────────────
  app.use(cookieParser(env.COOKIE_SECRET));

  // ─── Request Body Parsers ───────────────────────────────────────────────────
  // Strict 1MB size limit to guard against memory exhaustion (returns clean 413)
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  // ─── HTTP Request Logging ───────────────────────────────────────────────────
  if (env.NODE_ENV !== "test") {
    app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
  }

  // ─── Fast, Cached Widget Delivery (Static Assets) ───────────────────────────
  const publicDir = path.join(process.cwd(), "public");
  app.use(
    express.static(publicDir, {
      maxAge: "1d",
      etag: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith(".js")) {
          // Versioned script caching (Section 4 & 6 of Brief)
          res.setHeader("Cache-Control", "public, max-age=86400, immutable");
          res.setHeader("Access-Control-Allow-Origin", "*");
        }
      },
    })
  );

  // Explicit route for versioned widget delivery
  app.get(["/widget.v1.js", "/widget.js"], (req: Request, res: Response) => {
    res.setHeader("Content-Type", "application/javascript");
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.sendFile(path.join(publicDir, "widget.v1.js"));
  });

  // ─── Swagger Documentation ──────────────────────────────────────────────────
  setupSwagger(app);

  // ─── Rate Limiter (General API) ─────────────────────────────────────────────
  // (Note: /api/submissions has its own dedicated stricter burst limiter)
  app.use("/api/widgets", apiRateLimiter);
  app.use("/api/dashboard", apiRateLimiter);

  // ─── CSRF Protection ────────────────────────────────────────────────────────
  // Enforces Double-Submit Cookie CSRF on mutating requests (exempts public submissions)
  app.use(csrfProtection);

  // ─── API Routes ─────────────────────────────────────────────────────────────
  app.use(routes);

  // ─── 404 Catch-All Handler ──────────────────────────────────────────────────
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      message: `Route ${req.method} ${req.originalUrl} not found`,
      statusCode: 404,
    });
  });

  // ─── Global Centralized Error Handler ───────────────────────────────────────
  app.use(errorHandler);

  return app;
}

export default createApp;
