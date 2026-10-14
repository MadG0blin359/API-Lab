import { Request, Response } from "express";
import { submissionService } from "../services/submission.service.js";

/**
 * Helper to reliably resolve the caller's public or test IP.
 * Checks x-forwarded-for (behind proxies/Render), x-real-ip, or req.ip.
 */
function extractClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0];
    if (raw) return raw.trim();
  }
  const realIp = req.headers["x-real-ip"];
  if (realIp && typeof realIp === "string") {
    return realIp.trim();
  }
  return req.ip || "127.0.0.1";
}

export const createPublicSubmission = async (req: Request, res: Response): Promise<void> => {
  const clientIp = extractClientIp(req);
  const userAgent = req.headers["user-agent"];
  const origin = req.headers["origin"] as string | undefined;
  const referer = req.headers["referer"] as string | undefined;

  // Process the hardened submission pipeline
  const result = await submissionService.processSubmission(req.body, clientIp, {
    userAgent,
    origin,
    referer,
  });

  // Explicit CORS header for maximum compatibility across external origins
  res.setHeader("Access-Control-Allow-Origin", "*");

  res.status(201).json({
    success: true,
    message: "Submission received and processed successfully",
    data: {
      id: result.submission.id,
      widget_id: result.submission.widget_id,
      enriched: result.enriched,
      created_at: result.submission.created_at,
    },
  });
};

export const getSubmissions = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const result = await submissionService.getAll(userId, req.query as any, req.token);

  res.status(200).json({
    success: true,
    data: result.submissions,
    pagination: result.pagination,
  });
};

export const getSubmissionById = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  const submission = await submissionService.getById(
    req.params.id as string,
    userId,
    req.token
  );

  res.status(200).json({
    success: true,
    data: submission,
  });
};

export const deleteSubmission = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user!.id;
  await submissionService.delete(req.params.id as string, userId, req.token);

  res.status(200).json({
    success: true,
    message: "Submission deleted successfully",
  });
};
