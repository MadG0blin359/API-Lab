import { inngestClient } from "../inngest/client.js";
import { mediaRepository } from "../repositories/media.repository.js";
import { storageService } from "./storage.service.js";
import AppError from "../utils/app.error.js";

export const mediaService = {
  async processUpload(file: Express.Multer.File) {
    // 1. Upload raw buffer to temporary storage
    let storagePath: string;
    try {
      storagePath = await storageService.uploadIncoming(
        file.buffer,
        file.originalname,
        file.mimetype,
      );
    } catch (err) {
      console.error("Storage upload error:", err);
      throw new AppError(500, "Failed to cache incoming file.");
    }

    // 2. Delegate job registration and background dispatch
    return this.processDirectUpload(storagePath, file.originalname, file.mimetype);
  },

  /**
   * Enqueues an asset uploaded directly to Supabase via presigned upload URL.
   * Consumes virtually 0 server RAM and 0 server upload bandwidth.
   */
  async processDirectUpload(storagePath: string, filename: string, mimetype?: string) {
    // 1. Register the job in PostgreSQL
    let job: { id: string };
    try {
      job = await mediaRepository.createJob(filename);
    } catch (err) {
      console.error("Database insert error:", err);
      await storageService.deleteFiles([storagePath]);
      throw new AppError(500, "Database insertion failed.");
    }

    // 2. Dispatch Inngest background optimization job
    try {
      await inngestClient.send({
        name: "media/process.requested",
        data: {
          jobId: job.id,
          storagePath,
          mimetype: mimetype || "image/jpeg",
        },
      });
    } catch (err) {
      console.error("Inngest dispatch error:", err);
      await storageService.deleteFiles([storagePath]);
      throw new AppError(500, "Failed to dispatch processing job.");
    }

    return job.id;
  },

  async getJobStatus(id: string) {
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      throw new AppError(400, "Invalid job ID format. Must be a valid UUID.");
    }

    const { data, error } = await mediaRepository.getJobById(id);

    if (error || !data) {
      throw new AppError(404, "Job ID not found.");
    }

    return data;
  },
};
