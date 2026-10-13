import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import redisClient from "../config/redis.client.js";

const createStore = (prefix) => {
  return new RedisStore({
    sendCommand: async (...args) => {
      if (!redisClient.isOpen) {
        // Wait briefly for Redis connection if server is in bootstrap phase
        await new Promise((resolve) => {
          if (redisClient.isOpen) return resolve();
          redisClient.once("ready", resolve);
          setTimeout(resolve, 1500);
        });

        if (!redisClient.isOpen) {
          throw new Error("Redis client is not connected");
        }
      }
      return redisClient.sendCommand(args);
    },
    prefix: `rl:${prefix}:`,
  });
};

/**
 * Strict rate limiter for sensitive authentication endpoints (prevent brute-force)
 * 15 requests per 15 minutes per IP
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  store: createStore("auth"),
  message: {
    status: "fail",
    message:
      "Too many authentication attempts from this IP, please try again in 15 minutes.",
  },
});

/**
 * General rate limiter for general API endpoints
 * 300 requests per 15 minutes per IP
 */
export const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  passOnStoreError: true,
  store: createStore("api"),
  message: {
    status: "fail",
    message: "Too many requests from this IP, please try again later.",
  },
});
