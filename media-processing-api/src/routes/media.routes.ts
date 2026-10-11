import { Router } from "express";
import { uploadMedia, getJobStatus } from "../controllers/media.controller.js";
import { uploadMiddleware } from "../middlewares/upload.middleware.js";

const router = Router();

// Expecting a multipart/form-data field named 'mediaFile'
router.post("/upload", uploadMiddleware.single("mediaFile"), uploadMedia);
router.get("/:id", getJobStatus);

export default router;