import supabase from "../config/supabase.client.js";
import AppError from "../utils/app.error.js";
import asyncHandler from "../utils/async.handler.js";

// Use authorization header validator (auth.validator.js) before using authenticateUser()
export const authenticateUser = asyncHandler(async (req, res, next) => {
  const { error, data } = await supabase.auth.getUser(req.token);

  if (error || !data?.user) {
    return next(new AppError(401, "Invalid or expired token"));
  }

  req.user = data.user;
  return next();
});
