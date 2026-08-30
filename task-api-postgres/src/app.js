import express, { json } from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";

import metaRouter from "./routes/meta.routes.js";
import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/user.routes.js";
import taskRouter from "./routes/task.routes.js";
import globalErrorHandler from "./middlewares/error.handler.js";

import setupSwagger from "./utils/swagger.ui.js";
import { validateCsrfToken } from "./middlewares/csrf.middleware.js";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Verify the Signed Double-Submit Cookie
  app.use(validateCsrfToken);

  // Automatically compress the 'res' if the client supports it, and inject 'Vary: Accept-Encoding' header.
  app.use(compression());

  // Configure CORS to dynamically whitelist specific frontend properties
  const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://hoppscotch.io",
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow server-to-server requests (no origin)
        if (!origin) {
          return callback(null, true);
        }
        // or requests strictly originating from the whitelist
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          // omits the CORS headers from the response, blocking request without crashing Node server
          callback(null, false);
        }
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Accept", "x-csrf-token"],
    }),
  );

  setupSwagger(app);

  app.use("/", metaRouter);
  app.use("/auth", authRouter);
  app.use("/user", userRouter);
  app.use("/tasks", taskRouter);

  app.all(/.*/, (req, res) =>
    res.status(404).json({
      status: "fail",
      message: `${req.originalUrl} Does Not Exist.`,
    }),
  );

  app.use(globalErrorHandler);

  return app;
}

export default createApp;
