import { Request, Response, NextFunction } from "express";
import { auth } from "../config/firebase.js";
import { AppError } from "../utils/app-error.js";
import { logger } from "../utils/logger.js";

/**
 * Middleware that requires a valid Firebase Auth ID Token (JWT).
 * Attaches the decoded user to `req.user`.
 * Express 5 automatically routes thrown errors to the global errorHandler.
 */
export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError(
      401,
      "Authentication token missing or invalid format (Bearer token expected)"
    );
  }

  const token = authHeader.split(" ")[1]?.trim();

  if (!token) {
    throw new AppError(401, "Bearer token is empty");
  }

  try {
    const decodedToken = await auth.verifyIdToken(token);

    req.user = {
      ...decodedToken,
      id: decodedToken.uid,
      uid: decodedToken.uid,
    };
    req.token = token;
    next();
  } catch (error: any) {
    logger.warn(`[AuthMiddleware] Token verification failed: ${error.message}`);
    throw new AppError(401, `Invalid or expired authentication token: ${error.message}`);
  }
};

/**
 * Optional Auth middleware: attaches `req.user` if a valid Firebase token is provided,
 * but allows the request to continue if no token is sent.
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1]?.trim();
    if (token) {
      try {
        const decodedToken = await auth.verifyIdToken(token);
        req.user = {
          ...decodedToken,
          id: decodedToken.uid,
          uid: decodedToken.uid,
        };
        req.token = token;
      } catch {
        // Intentionally ignore failure in optional auth
      }
    }
  }

  next();
};

export default requireAuth;
