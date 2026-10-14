import { Router } from "express";
import multer from "multer";
import {
  uploadFile,
  createSignedUrl,
  listFiles,
  deleteFile,
} from "../controllers/storage.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

const router = Router();

// Upload file to Supabase Storage (requires Auth)
router.post("/upload", requireAuth, upload.single("file"), uploadFile);

// Generate signed download URL for private files (requires Auth)
router.post("/signed-url", requireAuth, createSignedUrl);

// List files in bucket (requires Auth)
router.get("/files", requireAuth, listFiles);

// Delete files from storage (requires Auth)
router.delete("/files", requireAuth, deleteFile);

export default router;
