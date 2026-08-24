import asyncHandler from "../utils/async.handler.js";
import supabase from "../config/supabase.client.js";
import AppError from "../utils/app.error.js";

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

  return res.status(200).json({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_at: data.session.expires_at,
    expires_in: data.session.expires_in,
  });
});
