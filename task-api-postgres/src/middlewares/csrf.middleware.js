import crypto from "crypto";
import AppError from "../utils/app.error.js";

const CSRF_SECRET = process.env.CSRF_SECRET;

// Time Complexity: O(L) where L is the token length. Space Complexity: O(1).
const generateSignedToken = () => {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const signature = crypto
    .createHmac("sha256", CSRF_SECRET)
    .update(rawToken)
    .digest("hex");
  return `${rawToken}.${signature}`;
};

const verifySignedToken = (signedToken) => {
  if (!signedToken || typeof signedToken !== "string") return false;

  const [rawToken, providedSignature] = signedToken.split(".");
  if (!rawToken || !providedSignature) return false;

  const expectedSignature = crypto
    .createHmac("sha256", CSRF_SECRET)
    .update(rawToken)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(providedSignature),
    Buffer.from(expectedSignature),
  );
};

// Works in authentication routes, after successful login.
export const attachCsrfToken = (req, res, next) => {
  const signedToken = generateSignedToken();

  res.cookie("csrf_token", signedToken, {
    httpOnly: false, // Must be false so the frontend client can read and header-inject it
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  });

  return next();
};

// Validates globally in app.js after your cookie-parser
export const validateCsrfToken = (req, res, next) => {
  const safeMethods = ["GET", "HEAD", "OPTIONS"];
  const excludedPaths = ["/auth/login", "/auth/signup"];

  // Bypass read-only operations or explicitly excluded paths
  if (safeMethods.includes(req.method) || excludedPaths.includes(req.path)) {
    return next();
  }

  const headerToken = req.headers["x-csrf-token"];
  const cookieToken = req.cookies.csrf_token;

  // Enforce Token Symmetry (Double-Submit Requirement)
  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return next(new AppError(403, "Invalid or missing CSRF token"));
  }

  // Enforce Cryptographic Authenticity
  if (!verifySignedToken(headerToken)) {
    return next(new AppError(403, "CSRF token signature verification failed"));
  }

  return next();
};
