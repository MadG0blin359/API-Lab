import { Server } from "http";
import createApp from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./utils/logger.js";

// Catch unhandled synchronous exceptions
process.on("uncaughtException", (err: Error) => {
  logger.error("UNCAUGHT EXCEPTION! 💥 Shutting down...", err);
  process.exit(1);
});

let server: Server;

try {
  const app = createApp();

  server = app.listen(env.PORT, "0.0.0.0", () => {
    logger.info(`🚀 Server running in [${env.NODE_ENV}] mode on port ${env.PORT}`);
    logger.info(`📑 API Documentation: http://localhost:${env.PORT}/docs`);
    logger.info(`🩺 Health check: http://localhost:${env.PORT}/health`);
  });
} catch (error) {
  logger.error("❌ Fatal error starting the application:", error);
  process.exit(1);
}

// Catch unhandled promise rejections
process.on("unhandledRejection", (reason: any) => {
  logger.error("UNHANDLED REJECTION! 💥", reason);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Graceful shutdown on termination signals
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    logger.info(`🛑 ${signal} received. Closing HTTP server gracefully...`);
    if (server) {
      server.close(() => {
        logger.info("✅ HTTP server closed. Process terminating.");
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
}
