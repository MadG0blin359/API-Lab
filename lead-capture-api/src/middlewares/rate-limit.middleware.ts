import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";

/**
 * Standard API rate limiter for general authenticated and dashboard routes.
 */
export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP address. Please try again later.",
    statusCode: 429,
  },
});

/**
 * Stricter rate limiter for authentication endpoints to prevent brute force.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again after 15 minutes.",
    statusCode: 429,
  },
});

/**
 * Hardened submission rate limiter for the public submission endpoint.
 * Protects backend from burst floods while keeping legit traffic flowing.
 */
export const submissionRateLimiter = rateLimit({
  windowMs: env.SUBMISSION_RATE_LIMIT_WINDOW_MS,
  max: env.SUBMISSION_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Rate limit exceeded. Too many submissions from this IP address. Please wait before submitting again.",
    statusCode: 429,
  },
});
