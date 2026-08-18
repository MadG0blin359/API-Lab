import createApp from "./src/app.js";
import taskRepository from "./src/repositories/task.repository.js";
import validateEnv from "./src/validators/env.validator.js";
import redisClient from "./src/config/redis.client.js";

// Global Synchronous Code Error Handler
process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  console.log(`${err.name}: ${err.message}`);
  // Shutdown immediately
  process.exit(1);
});

// Declare server in the outer scope for the unhandledRejection handler
let server;

// The asynchronous bootstrap sequence
async function bootstrap() {
  try {
    console.log("🔍 Verifying environment variables...");
    validateEnv();

    // Suspend HTTP initialization until database is verified and seeded
    console.log("⏳ Preparing database...");
    await taskRepository.seedDatabaseIfEmpty();

    await redisClient.connect();
    const pingResponse = await redisClient.ping();
    console.log(`🏓 Redis PING Response: ${pingResponse}`);

    const app = createApp();
    const PORT = process.env.API_PORT || 5000;

    // Open network ports only after internal infrastructure is ready
    server = app.listen(PORT, () => {
      console.log(
        `🚀 Server is running in ${process.env.NODE_ENV} mode on port ${PORT}...`,
      );
      console.log(`Swagger UI available at http://localhost:${PORT}/docs`);
    });
  } catch (error) {
    console.error("❌ Fatal error during application bootstrap:");
    console.error(error.message);
    process.exit(1);
  }
}

// Execute the bootstrap sequence
bootstrap();

// Global Asynchronous Code Error Handler
process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! 💥 Shutting down...");
  console.log(`${err.name}: ${err.message}`);

  // Verify the server exists before attempting to close it
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});
