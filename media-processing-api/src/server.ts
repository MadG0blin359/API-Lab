import { Server } from "http";
import createApp from "./app.js";

import validateEnv from "./validators/env.validator.js";

// Global Synchronous Code Error Handler
process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  console.log(`${err.name}: ${err.message}`);
  process.exit(1);
});

// Declare server in the outer scope for shutdown handlers
let server: Server;

(function bootstrap() {
  try {
    console.log("🔍 Verifying environment variables...");
    validateEnv();

    const app = createApp();
    const PORT = process.env.PORT || 3000;

    server = app.listen(PORT, (): void => {
      console.log(
        `🚀 Server is running in ${process.env.NODE_ENV} mode on port ${PORT}...`,
      );
    });
  } catch (error) {
    console.error("❌ Fatal error during application bootstrap:");

    if (error instanceof Error) console.error(error.message);
    else console.error(error);

    process.exit(1);
  }
})();

// Global Asynchronous Code Error Handler
process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! 💥 Shutting down...");
  if (err instanceof Error) {
    console.log(`${err.name}: ${err.message}`);
  }

  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Graceful shutdown for container orchestrators (Docker, Railway, etc.)
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    console.log(`\n${signal} received. Closing server gracefully...`);
    if (server) {
      server.close(() => {
        console.log("✅ Server closed.");
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
}
