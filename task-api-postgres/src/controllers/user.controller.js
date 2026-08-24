import asyncHandler from "../utils/async.handler.js";
import supabase from "../config/supabase.client.js";
import redisClient from "../config/redis.client.js";
import AppError from "../utils/app.error.js";

export const getPublicInfo = (req, res) => {
  return res.status(200).json({
    status: "success",
    message: "Welcome stranger! This info is public.",
  });
};

export const getProfile = (req, res) => {
  return res.status(200).json({
    id: req.user.id,
    email: req.user.email,
    created_at: req.user.created_at,
  });
};

export const logout = asyncHandler(async (req, res) => {
  // const timeToLive = req.user;
  console.log(req.user);

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new AppError(400, error.message);
  }

  return res.status(204).send();
});
