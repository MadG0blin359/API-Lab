import rateLimit from "express-rate-limit";
import AppError from "../utils/app.error.js";

/**
 * Strict Rate Limiter for media upload endpoint:
 * Limits each IP address to 10 upload requests per 60 seconds.
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 uploads per windowMs per IP
  standardHeaders: true, // Return standard RateLimit-* headers
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new AppError(429, "Too many uploads from this IP. Please try again after 1 minute."));
  },
});

/**
 * General API Rate Limiter:
 * 100 requests per minute per IP for status polling / general routes.
 */
export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new AppError(429, "Too many requests. Please slow down."));
  },
});
