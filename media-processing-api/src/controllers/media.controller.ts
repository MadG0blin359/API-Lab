import { Request, Response, NextFunction } from "express";
import { mediaService } from "../services/media.service.js";
import { supabase } from "../utils/supabase.js";
import { SUPABASE_BUCKET } from "../config/constants.js";
import AppError from "../utils/app.error.js";

export const uploadMedia = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    return next(new AppError(400, "No file provided in the request payload."));
  }

  const jobId = await mediaService.processUpload(req.file);

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
    const { data: signedData, error: signError } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .createSignedUrl(job.result_url, 3600);

    if (signError || !signedData?.signedUrl) {
      throw new AppError(500, `Failed to generate signed URL: ${signError?.message || "Token signing error"}`);
    }

    job.result_url = signedData.signedUrl;
  }

  return res.status(200).json({
    status: "success",
    data: job,
  });
};