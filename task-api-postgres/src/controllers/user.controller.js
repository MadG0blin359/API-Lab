import asyncHandler from "../utils/async.handler.js";
import supabase from "../config/supabase.client.js";
import AppError from "../utils/app.error.js";
import redisClient from "../config/redis.client.js";
import jwt from "jsonwebtoken";

const clearCookies = (res) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };

  res.clearCookie("access_token", cookieOptions);
  res.clearCookie("refresh_token", cookieOptions);

  // The CSRF cookie was set with httpOnly: false, so it must be cleared similarly
  res.clearCookie("csrf_token", {
    ...cookieOptions,
    httpOnly: false,
  });
};

export const getPublicInfo = (req, res) => {
  return res.status(200).json({
    status: "success",
    message: "Welcome stranger! This info is public.",
  });
};

export const getProfile = (req, res) => {
  // req.user is coming from authenticate.user.js middleware
  return res.status(200).json({
    id: req.user.id,
    email: req.user.email,
    created_at: req.user.created_at,
  });
};

export const logout = asyncHandler(async (req, res) => {
  const token = req.token;

  if (token) {
    const decoded = jwt.decode(token);

    if (decoded && decoded.exp) {
      const timeToLive = decoded.exp - Math.floor(Date.now() / 1000);

      if (timeToLive > 0) {
        await redisClient.setEx(`blacklist:${token}`, timeToLive, "invalid");
      }
    }
  }

  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new AppError(400, error.message);
  }

  clearCookies(res);

  return res.status(204).send();
});
