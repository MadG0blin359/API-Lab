import { inngestClient } from "../client.js";
import { storageService } from "../../services/storage.service.js";
import { mediaRepository } from "../../repositories/media.repository.js";
import {
  MAX_IMAGE_WIDTH,
  MAX_IMAGE_HEIGHT,
  WEBP_QUALITY,
} from "../../config/constants.js";
import sharp from "sharp";

export const processMediaJob = inngestClient.createFunction(
  {
    id: "process-media-job",
    retries: 2,
    triggers: [{ event: "media/process.requested" }],
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { jobId, storagePath, mimetype } = event.data as {
      jobId: string;
      storagePath: string;
      mimetype: string;
    };

    try {
      // Step 1: Mark the job as processing
      await step.run("update-status-processing", async () => {
        await mediaRepository.updateJobStatus(jobId, {
          status: "processing",
          updated_at: new Date().toISOString(),
        });
      });

      // Step 2: Download the raw file from Supabase Storage
      const rawBuffer: number[] = await step.run("download-raw", async () => {
        const buffer = await storageService.download(storagePath);
        return Array.from(new Uint8Array(buffer));
      });

      // Step 3: Process the image with sharp (resize + WebP conversion)
      const processedBuffer: number[] = await step.run("process-image", async () => {
        const inputBuffer = Buffer.from(rawBuffer);

        const outputBuffer = await sharp(inputBuffer)
          .resize(MAX_IMAGE_WIDTH, MAX_IMAGE_HEIGHT, {
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality: WEBP_QUALITY })
          .toBuffer();

        return Array.from(new Uint8Array(outputBuffer));
      });

      // Step 4: Upload the processed WebP to Supabase Storage
      const publicUrl: string = await step.run("upload-processed", async () => {
        const outputBuffer = Buffer.from(processedBuffer);
        const url = await storageService.uploadProcessed(outputBuffer, `${jobId}.webp`);
        return url;
      });

      // Step 5: Mark the job as completed with the result URL
      await step.run("update-status-completed", async () => {
        await mediaRepository.updateJobStatus(jobId, {
          status: "completed",
          result_url: publicUrl,
          updated_at: new Date().toISOString(),
        });
      });

      // Cleanup: Remove the temporary incoming file
      await step.run("cleanup-incoming", async () => {
        await storageService.deleteFiles([storagePath]);
      });

      return { jobId, status: "completed", resultUrl: publicUrl };
    } catch (error) {
      // On any failure, mark the job as failed with the error message
      const errorMessage = error instanceof Error ? error.message : "Unknown processing error";

      await step.run("update-status-failed", async () => {
        await mediaRepository.updateJobStatus(jobId, {
          status: "failed",
          error_message: errorMessage,
          updated_at: new Date().toISOString(),
        });
      });

      // Best-effort cleanup of the incoming file
      await step.run("cleanup-incoming-on-failure", async () => {
        await storageService.deleteFiles([storagePath]);
      });

      throw error;
    }
  },
);
