import multer from "multer";
import { fileTypeFromBuffer } from "file-type";
import AppError from "../utils/app.error.js";
import { MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES } from "../config/constants.js";
import type { Request, Response, NextFunction } from "express";

const storage = multer.memoryStorage();

// Level 1: HTTP Header MIME type validation
const multerUpload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
  fileFilter: (req, file, cb) => {
    if ((ALLOWED_MIME_TYPES as readonly string[]).includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(415, "Unsupported Media Type. Only JPG, PNG, and WebP are allowed."));
    }
  },
});

/**
 * Level 2: Strict Magic Byte Buffer Validation Middleware
 * Inspects real binary signature headers from buffer to prevent MIME spoofing.
 */
export const validateMagicBytes = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.file || !req.file.buffer) {
    return next();
  }

  const detected = await fileTypeFromBuffer(req.file.buffer);

  if (!detected || !(ALLOWED_MIME_TYPES as readonly string[]).includes(detected.mime)) {
    return next(
      new AppError(
        415,
        `Malicious or invalid file format detected. Declared: ${req.file.mimetype}, detected: ${detected?.mime || "unknown"}. Only valid JPG, PNG, and WebP images are accepted.`,
      ),
    );
  }

  // Update with verified MIME type and extension
  req.file.mimetype = detected.mime;
  next();
};

export const uploadSingleMedia = [
  multerUpload.single("mediaFile"),
  validateMagicBytes,
];