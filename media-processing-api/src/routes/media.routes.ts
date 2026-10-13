import { Router } from "express";
import {
  uploadMedia,
  getJobStatus,
  streamJobEvents,
  presignUpload,
  processPresignedUpload,
} from "../controllers/media.controller.js";
import { uploadSingleMedia } from "../middlewares/upload.middleware.js";
import { uploadRateLimiter, generalRateLimiter } from "../middlewares/rate-limit.middleware.js";

const router = Router();

// Standard upload via Express memory buffer (10 uploads/min limit + magic bytes)
router.post("/upload", uploadRateLimiter, uploadSingleMedia, uploadMedia);

// Direct-to-Storage Ingestion (Zero RAM / Zero Server Bandwidth)
router.post("/presign-upload", uploadRateLimiter, presignUpload);
router.post("/process-direct", uploadRateLimiter, processPresignedUpload);

// Real-Time Server-Sent Events stream for job progress
router.get("/:id/events", generalRateLimiter, streamJobEvents);

// Standard status lookup with 1-hour signed URL resolution
router.get("/:id", generalRateLimiter, getJobStatus);

export default router;