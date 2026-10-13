import { Request, Response, NextFunction } from "express";
import { mediaService } from "../services/media.service.js";
import { supabase } from "../utils/supabase.js";
import { SUPABASE_BUCKET } from "../config/constants.js";
import { jobEvents, JobEventPayload } from "../utils/events.js";
import { mediaUploadsTotal } from "../utils/metrics.js";
import AppError from "../utils/app.error.js";

/**
 * Helper to dynamically create signed URLs for single or multi-variant assets
 */
const resolveSignedResult = async (resultUrlValue: string): Promise<any> => {
  try {
    const parsed = JSON.parse(resultUrlValue);
    if (parsed.variants && typeof parsed.variants === "object") {
      const signedVariants: Record<string, any> = {};

      for (const [key, variant] of Object.entries(parsed.variants) as [string, any][]) {
        if (variant?.path) {
          const { data, error } = await supabase.storage
            .from(SUPABASE_BUCKET)
            .createSignedUrl(variant.path, 3600);

          if (error || !data?.signedUrl) {
            throw new AppError(500, `Failed to sign URL for ${key} variant: ${error?.message || "Token error"}`);
          }

          signedVariants[key] = {
            url: data.signedUrl,
            width: variant.width,
            height: variant.height,
          };
        }
      }

      return {
        variants: signedVariants,
        blurhash: parsed.blurhash,
        lqip: parsed.lqip,
      };
    }
  } catch (e) {
    if (e instanceof AppError) throw e;
    // Fallback: If resultUrlValue is a plain path string
  }

  // Single file fallback
  const { data: signedData, error: signError } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .createSignedUrl(resultUrlValue, 3600);

  if (signError || !signedData?.signedUrl) {
    throw new AppError(500, `Failed to generate signed URL: ${signError?.message || "Token signing error"}`);
  }

  return signedData.signedUrl;
};

export const uploadMedia = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    return next(new AppError(400, "No file provided in the request payload."));
  }

  const jobId = await mediaService.processUpload(req.file);
  mediaUploadsTotal.inc({ status: "accepted" });

  return res.status(202).json({
    status: "success",
    message: "Media processing accepted.",
    jobId,
  });
};

export const getJobStatus = async (req: Request, res: Response, next: NextFunction) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!id) {
    return next(new AppError(400, "Job ID is required."));
  }

  const job = await mediaService.getJobStatus(id);

  if (job.status === "completed" && job.result_url) {
    job.result_url = await resolveSignedResult(job.result_url);
  }

  return res.status(200).json({
    status: "success",
    data: job,
  });
};

/**
 * Server-Sent Events (SSE) Endpoint:
 * Streams real-time processing updates to the client until job completes or fails.
 */
export const streamJobEvents = async (req: Request, res: Response, next: NextFunction) => {
  const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!id) {
    return next(new AppError(400, "Job ID is required."));
  }

  // Verify job exists
  const currentJob = await mediaService.getJobStatus(id);

  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable buffering for Nginx / reverse proxies
  res.flushHeaders?.();

  // If already completed or failed, send immediate event and close
  if (currentJob.status === "completed") {
    const signedData = currentJob.result_url
      ? await resolveSignedResult(currentJob.result_url)
      : null;

    res.write(
      `data: ${JSON.stringify({
        jobId: id,
        status: "completed",
        data: signedData,
        timestamp: new Date().toISOString(),
      })}\n\n`,
    );
    res.end();
    return;
  }

  if (currentJob.status === "failed") {
    res.write(
      `data: ${JSON.stringify({
        jobId: id,
        status: "failed",
        error: currentJob.error_message,
        timestamp: new Date().toISOString(),
      })}\n\n`,
    );
    res.end();
    return;
  }

  // Send initial pending/processing state
  res.write(
    `data: ${JSON.stringify({
      jobId: id,
      status: currentJob.status,
      timestamp: new Date().toISOString(),
    })}\n\n`,
  );

  // Listener for future events
  const onJobUpdate = async (payload: JobEventPayload) => {
    try {
      if (payload.status === "completed" && payload.data) {
        // Resolve signed URLs before pushing event
        const rawResultUrl = typeof payload.data === "string" ? payload.data : JSON.stringify(payload.data);
        payload.data = await resolveSignedResult(rawResultUrl);
      }

      res.write(`data: ${JSON.stringify(payload)}\n\n`);

      if (payload.status === "completed" || payload.status === "failed") {
        cleanup();
        res.end();
      }
    } catch {
      cleanup();
      res.end();
    }
  };

  const cleanup = () => {
    jobEvents.off(`job:${id}`, onJobUpdate);
  };

  jobEvents.on(`job:${id}`, onJobUpdate);

  // Keep-alive heartbeat every 20 seconds
  const heartbeat = setInterval(() => {
    res.write(": ping\n\n");
  }, 20000);

  req.on("close", () => {
    clearInterval(heartbeat);
    cleanup();
  });
};