import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/app-error.js";
import { logger } from "../utils/logger.js";
import multer from "multer";

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Internal Server Error";

  // Handle express.json() payload size limit (Probe 2: Oversized payloads)
  if (err.type === "entity.too.large" || statusCode === 413) {
    statusCode = 413;
    message = "Payload Too Large: The request body exceeds the maximum permitted size limit.";
  }

  // Handle malformed JSON body parse error
  if (err instanceof SyntaxError && "body" in err && (err as any).status === 400) {
    statusCode = 400;
    message = "Malformed JSON: The request body contains invalid JSON syntax.";
  }

  // Handle Multer upload errors
  if (err instanceof multer.MulterError) {
    statusCode = 400;
    if (err.code === "LIMIT_FILE_SIZE") {
      message = "Uploaded file exceeds the maximum allowed file size.";
    } else {
      message = `File upload error: ${err.message}`;
    }
  }

  // Handle CSRF token validation errors
  if (err.code === "EBADCSRFTOKEN") {
    statusCode = 403;
    message = "Invalid or missing CSRF token. Please provide a valid 'x-csrf-token' header.";
  }

  // Handle PostgREST / Supabase specific errors
  if (err.code && typeof err.code === "string" && err.details) {
    logger.warn(`PostgREST error: ${err.message} (${err.code})`);
    // PostgreSQL unique constraint violation
    if (err.code === "23505") {
      statusCode = 409;
      message = "Resource already exists or violates unique constraint.";
    }
  }

  // Log non-operational (server crash / bug) errors
  if (!err.isOperational && statusCode === 500) {
    logger.error(`Unhandled Exception on ${req.method} ${req.originalUrl}:`, err);
  }

  const responseBody: Record<string, any> = {
    success: false,
    message,
    statusCode,
  };

  if (process.env.NODE_ENV === "development" && statusCode === 500) {
    responseBody.stack = err.stack;
    responseBody.details = err;
  }

  res.status(statusCode).json(responseBody);
};

export default errorHandler;
