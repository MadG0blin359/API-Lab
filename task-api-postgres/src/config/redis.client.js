import { createClient } from "redis";

const redisClient = createClient({
  socket: {
    host: process.env.REDIS_HOST || "localhost",
    port: process.env.REDIS_PORT || 6379,
  },
});

redisClient.on("error", (err) => {
  console.error("⚠️ Redis Client Error: ", err);
});

redisClient.on("connect", () => {
  console.log("🔌 Connecting to Redis...");
});

redisClient.on("ready", () => {
  console.log("✅ Redis Connected Successfully!");
});

export default redisClient;
