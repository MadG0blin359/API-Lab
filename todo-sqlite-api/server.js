import createApp from "./src/app.js";

// Global Synchronous Code Error Handler
process.on("uncaughtException", (err) => {
  console.log("UNCAUGHT EXCEPTION! 💥 Shutting down...");
  console.log(`${err.name}: ${err.message}`);
  // Shutdown immediately
  process.exit(1);
});

const app = createApp();
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(
    `Server is running in ${process.env.NODE_ENV} mode on port ${PORT}...`,
  );
  console.log(`Swagger UI available at http://localhost:${PORT}/docs`);
});

// Global Asynchronous Code Error Handler
process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! 💥 Shutting down...");
  console.log(`${err.name}: ${err.message}`);
  // Shutdown gracefully
  server.close(() => {
    process.exit(1);
  });
});
