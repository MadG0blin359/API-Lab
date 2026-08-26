import AppError from "../utils/app.error.js";

export const validateEmailPassword = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError(400, "Email and password are required"));
  }
  if (password.length < 8)
    return next(new AppError(400, "Password must be of 8 or more characters"));

  return next();
};

export const validateAuthorizationHeader = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new AppError(401, "Access token required"));
  }

  const token = authHeader.split(" ")[1];

  if (!token) {
    return next(new AppError(401, "Access token required"));
  }

  req.token = token;

  return next();
};

export const validateRefreshToken = (req, res, next) => {
  const { refresh_token } = req.body;

  if (!refresh_token) {
    return next(new AppError(400, "Refresh token is required"));
  }

  return next();
};
