import { inngestClient } from "../client.js";
import { storageService } from "../../services/storage.service.js";
import { mediaRepository } from "../../repositories/media.repository.js";
import { jobEvents } from "../../utils/events.js";
import { mediaProcessedTotal, mediaProcessingDurationSeconds } from "../../utils/metrics.js";
import {
  IMAGE_VARIANTS,
  INNGEST_CONCURRENCY_LIMIT,
  INNGEST_RATE_LIMIT,
} from "../../config/constants.js";
import sharp from "sharp";
import { encode } from "blurhash";

export interface VariantResult {
  path: string;
  width: number;
  height: number;
}

export interface ProcessedAssetPayload {
  variants: Record<string, VariantResult>;
  blurhash: string;
  lqip: string;
}

export const processMediaJob = inngestClient.createFunction(
  {
    id: "process-media-job",
    retries: 2,
    triggers: [{ event: "media/process.requested" }],
    // ─── Concurrency & Rate Controls ───────────────────────────────
    concurrency: {
      limit: INNGEST_CONCURRENCY_LIMIT, // Limit concurrent workers to prevent container CPU/RAM exhaustion
    },
    rateLimit: {
      limit: INNGEST_RATE_LIMIT,
      period: "1m",
    },
  },
  async ({ event, step }: { event: any; step: any }) => {
    const { jobId, storagePath } = event.data as {
      jobId: string;
      storagePath: string;
      mimetype: string;
    };

    const startTime = Date.now();

    try {
      // Step 1: Mark job as processing in DB & notify SSE listeners
      await step.run("update-status-processing", async () => {
        await mediaRepository.updateJobStatus(jobId, {
          status: "processing",
          updated_at: new Date().toISOString(),
        });

        jobEvents.notify(jobId, {
          jobId,
          status: "processing",
          timestamp: new Date().toISOString(),
        });
      });

      // Step 2: Download raw file buffer from Supabase Storage
      const rawBufferArray: number[] = await step.run("download-raw", async () => {
        const buffer = await storageService.download(storagePath);
        return Array.from(new Uint8Array(buffer));
      });

      // Step 3: Process image variants, strip EXIF metadata, auto-rotate, compute LQIP and BlurHash
      const processedData: {
        variantBuffers: Record<string, { buffer: number[]; width: number; height: number }>;
        blurhash: string;
        lqip: string;
      } = await step.run("process-image-variants", async () => {
        const inputBuffer = Buffer.from(rawBufferArray);

        // Auto-orient based on EXIF tag, then strip all metadata to remove location/camera leaks
        const baseSharp = sharp(inputBuffer).rotate();

        // 3a. Generate BlurHash placeholder
        const rawPixels = await baseSharp
          .clone()
          .resize(32, 32, { fit: "cover" })
          .ensureAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });

        const blurhash = encode(
          new Uint8ClampedArray(rawPixels.data),
          rawPixels.info.width,
          rawPixels.info.height,
          4,
          4,
        );

        // 3b. Generate LQIP (Low-Quality Image Placeholder) as a Base64 data URL
        const lqipBuffer = await baseSharp
          .clone()
          .resize(20, 20, { fit: "inside" })
          .webp({ quality: 20 })
          .toBuffer();
        const lqip = `data:image/webp;base64,${lqipBuffer.toString("base64")}`;

        // 3c. Generate Responsive Variants (thumbnail, medium, full)
        const variantBuffers: Record<string, { buffer: number[]; width: number; height: number }> = {};

        for (const [name, config] of Object.entries(IMAGE_VARIANTS)) {
          const { data: outputBuf, info } = await baseSharp
            .clone()
            .resize(config.width, config.height, {
              fit: config.fit,
              withoutEnlargement: true,
            })
            .webp({ quality: config.quality })
            .toBuffer({ resolveWithObject: true });

          variantBuffers[name] = {
            buffer: Array.from(new Uint8Array(outputBuf)),
            width: info.width,
            height: info.height,
          };
        }

        return { variantBuffers, blurhash, lqip };
      });

      // Step 4: Upload all processed variants to Supabase Storage
      const uploadedVariants: Record<string, VariantResult> = await step.run(
        "upload-processed-variants",
        async () => {
          const result: Record<string, VariantResult> = {};

          for (const [name, item] of Object.entries(processedData.variantBuffers)) {
            const buf = Buffer.from(item.buffer);
            const fileName = `${jobId}-${name}.webp`;
            const storedPath = await storageService.uploadProcessed(buf, fileName);
            result[name] = {
              path: storedPath,
              width: item.width,
              height: item.height,
            };
          }

          return result;
        },
      );

      // Step 5: Save payload in media_jobs result_url (as structured JSON string)
      const finalPayload: ProcessedAssetPayload = {
        variants: uploadedVariants,
        blurhash: processedData.blurhash,
        lqip: processedData.lqip,
      };

      await step.run("update-status-completed", async () => {
        await mediaRepository.updateJobStatus(jobId, {
          status: "completed",
          result_url: JSON.stringify(finalPayload),
          updated_at: new Date().toISOString(),
        });
      });

      // Step 6: Clean up temporary incoming file
      await step.run("cleanup-incoming", async () => {
        await storageService.deleteFiles([storagePath]);
      });

      // Record metrics & broadcast completion to SSE listeners
      const durationSeconds = (Date.now() - startTime) / 1000;
      mediaProcessingDurationSeconds.observe(durationSeconds);
      mediaProcessedTotal.inc({ status: "completed" });

      jobEvents.notify(jobId, {
        jobId,
        status: "completed",
        data: finalPayload,
        timestamp: new Date().toISOString(),
      });

      return { jobId, status: "completed", data: finalPayload };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown processing error";

      await step.run("update-status-failed", async () => {
        await mediaRepository.updateJobStatus(jobId, {
          status: "failed",
          error_message: errorMessage,
          updated_at: new Date().toISOString(),
        });
      });

      await step.run("cleanup-incoming-on-failure", async () => {
        await storageService.deleteFiles([storagePath]);
      });

      mediaProcessedTotal.inc({ status: "failed" });

      jobEvents.notify(jobId, {
        jobId,
        status: "failed",
        error: errorMessage,
        timestamp: new Date().toISOString(),
      });

      throw error;
    }
  },
);
