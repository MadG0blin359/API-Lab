import multer from "multer";
import AppError from "../utils/app.error.js";
import { MAX_FILE_SIZE_BYTES, ALLOWED_MIME_TYPES } from "../config/constants.js";

const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
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