import supabase from "../config/supabase.client.js";
import redisClient from "../config/redis.client.js";
import AppError from "../utils/app.error.js";
import asyncHandler from "../utils/async.handler.js";

// Use authorization cookie validator (auth.validator.js) before using authenticateUser()
export const authenticateUser = asyncHandler(async (req, res, next) => {
  // Check if token has been blacklisted via Redis
  if (redisClient.isOpen) {
    const isBlacklisted = await redisClient.get(`blacklist:${req.token}`);
    if (isBlacklisted) {
      return next(
        new AppError(401, "Token has been revoked. Please log in again."),
      );
    }
  }

  const { error, data } = await supabase.auth.getUser(req.token);

  if (error || !data?.user) {
    return next(new AppError(401, "Invalid or expired token"));
  }

  req.user = data.user;
  return next();
});
