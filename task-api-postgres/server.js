import validateEnv from "./src/validators/env.validator.js";
import redisClient from "./src/config/redis.client.js";
import db from "./src/config/database.js";
import { initializeDatabase } from "./src/config/init.db.js";

// Global Synchronous Code Error Handler
process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  console.log(`${err.name}: ${err.message}`);
  process.exit(1);
});

let server;

// Asynchronous bootstrap sequence
async function bootstrap() {
  try {
    console.log("🔍 Verifying environment variables...");
    validateEnv();

    console.log("🔌 Connecting to Redis...");
    await redisClient.connect();
    const pingResponse = await redisClient.ping();
    console.log(`🏓 Redis PING Response: ${pingResponse}`);

    console.log("🛠️ Initializing database schema...");
    await initializeDatabase();

    const { default: createApp } = await import("./src/app.js");
    const app = createApp();
    const PORT = process.env.PORT || 3000;

    // Open network ports only after internal infrastructure is ready
    server = app.listen(PORT, "0.0.0.0", () => {
      console.log(
        `🚀 Server is running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}...`,
      );
      const hostUrl = process.env.RENDER_EXTERNAL_URL || "https://api-lab-task-api-postgres.onrender.com";
      const url =
        process.env.NODE_ENV === "production"
          ? `${hostUrl}/docs`
          : `http://localhost:${PORT}/docs`;
      console.log(`Swagger UI available at ${url}`);
    });
  } catch (error) {
    console.error("❌ Fatal error during application bootstrap:");
    console.error(error.message);
    process.exit(1);
  }
}

// Execute the bootstrap sequence
bootstrap();

// Graceful shutdown helper
async function gracefulShutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  if (server) {
    server.close(async () => {
      console.log("🔌 HTTP server closed.");
      try {
        if (redisClient.isOpen) {
          await redisClient.disconnect();
          console.log("🔌 Redis client disconnected.");
        }
        await db.end();
        console.log("🔌 PostgreSQL connection pool closed.");
      } catch (err) {
        console.error("Error during graceful shutdown:", err.message);
      } finally {
        process.exit(0);
      }
    });
  } else {
    process.exit(0);
  }
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Global Asynchronous Code Error Handler
process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! 💥 Shutting down...");
  console.log(`${err.name}: ${err.message}`);

  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});
