import { Request, Response, NextFunction } from "express";
import { mediaService } from "../services/media.service.js";
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
  const { id } = req.params;
  const data = await mediaService.getJobStatus(id);

  return res.status(200).json({
    status: "success",
    data,
  });
};