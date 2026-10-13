import { Router } from "express";
import { uploadMedia, getJobStatus, streamJobEvents } from "../controllers/media.controller.js";
import { uploadSingleMedia } from "../middlewares/upload.middleware.js";
import { uploadRateLimiter, generalRateLimiter } from "../middlewares/rate-limit.middleware.js";

const router = Router();

// Expecting a multipart/form-data field named 'mediaFile' with 10 uploads/min limit & magic bytes verification
router.post("/upload", uploadRateLimiter, uploadSingleMedia, uploadMedia);

// Real-Time Server-Sent Events stream for job progress
router.get("/:id/events", generalRateLimiter, streamJobEvents);

// Standard status lookup with 1-hour signed URL resolution
router.get("/:id", generalRateLimiter, getJobStatus);

export default router;