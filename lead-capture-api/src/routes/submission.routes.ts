import { Router } from "express";
import {
  createPublicSubmission,
  getSubmissions,
  getSubmissionById,
  deleteSubmission,
} from "../controllers/submission.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { submissionRateLimiter } from "../middlewares/rate-limit.middleware.js";
import {
  publicSubmissionSchema,
  submissionQuerySchema,
} from "../validators/submission.validator.js";

const router = Router();

// ─── Public Lead Submission Pipeline ──────────────────────────────────────────
// Accessible from any external origin with rate limiting & boundary validation
router.post(
  "/",
  submissionRateLimiter,
  validate({ body: publicSubmissionSchema }),
  createPublicSubmission
);

// ─── Authenticated Owner Telemetry & Lead Management ─────────────────────────
router.get(
  "/",
  requireAuth,
  validate({ query: submissionQuerySchema }),
  getSubmissions
);

router.get("/:id", requireAuth, getSubmissionById);
router.delete("/:id", requireAuth, deleteSubmission);

export default router;
