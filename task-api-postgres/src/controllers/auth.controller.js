import asyncHandler from "../utils/async.handler.js";
import supabase from "../config/supabase.client.js";
import AppError from "../utils/app.error.js";

function setSessionCookies(res, data) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // Require HTTPS in production
    sameSite: "strict",
  };

  res.cookie("access_token", data.session.access_token, {
    ...cookieOptions,
    maxAge: 3600 * 1000, // 1 hour in milliseconds
  });

  res.cookie("refresh_token", data.session.refresh_token, {
    ...cookieOptions,
    maxAge: 7 * 24 * 3600 * 1000, // 7 days in milliseconds
  });
}

export const signup = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { error, data } = await supabase.auth.signUp({ email, password });

  if (error) {
    throw new AppError(400, error.message);
  }

  return res.status(201).json({
    status: "success",
    message: "User SignUp Successfull!",
    data: data.user,
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const { error, data } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new AppError(401, "Invalid login credentials");
  }

  setSessionCookies(res, data);

  return res.status(200).json({
    status: "success",
    message: "Authentication Successful",
  });
});

export const refreshSession = asyncHandler(async (req, res) => {
  const { refresh_token } = req.body;
  const { error, data } = await supabase.auth.refreshSession({ refresh_token });

  if (!error || !data.session) {
    throw new AppError(401, "Invalid or expired refresh token");
  }

  setSessionDetails(res, data);

  return res.status(200).json({
    status: "success",
    message: "Session Refresh Successful",
  });
});

// Add attachCsrfToken as a middleware in auth routes
export const sendCsrfToken = (req, res) => {
  return res.status(200).json({ message: "CSRF token attached to cookies" });
};
