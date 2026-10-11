import type { Request, Response, NextFunction } from "express";
import multer from "multer";
import AppError from "../utils/app.error.js";

const sendErrorDev = (err: AppError, res: Response) => {
  return res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    error: err,
    stack: err.stack,
  });
};

const sendErrorProd = (err: AppError, res: Response) => {
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    console.error("Error 💥", err);
    return res.status(500).json({
      status: "error",
      message: "Something went wrong!",
    });
  }
};

/**
 * Converts known third-party errors into operational AppErrors
 * before they reach the environment-specific handler.
 */
const normalizeError = (err: Error): AppError => {
  // Handle Multer file-size and other errors
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return new AppError(413, "File exceeds the maximum upload size.");
    }
    return new AppError(400, `Upload error: ${err.message}`);
  }

  // Already an AppError — pass through
  if (err instanceof AppError) return err;

  // Unknown error — wrap as 500
  const appError = new AppError(500, err.message || "Internal Server Error");
  appError.isOperational = false;
  appError.stack = err.stack;
  return appError;
};

export default (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const error = normalizeError(err);

  if (process.env.NODE_ENV === "development") {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};
