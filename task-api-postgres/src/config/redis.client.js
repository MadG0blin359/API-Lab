import { createClient } from "redis";

let redisClient;

if (process.env.REDIS_URL) {
  const isTls = process.env.REDIS_URL.startsWith("rediss://");
  redisClient = createClient({
    url: process.env.REDIS_URL,
    socket: isTls
      ? {
          tls: true,
          rejectUnauthorized: false,
        }
      : undefined,
  });
} else {
  redisClient = createClient({
    socket: {
      host: process.env.REDIS_HOST || "localhost",
      port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    },
  });
}

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
