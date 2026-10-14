import { Router } from "express";
import {
  getWidgets,
  getWidgetById,
  createWidget,
  updateWidget,
  deleteWidget,
  getWidgetSnippet,
  getPublicWidgetConfig,
} from "../controllers/widget.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createWidgetSchema,
  updateWidgetSchema,
  widgetQuerySchema,
} from "../validators/widget.validator.js";

const router = Router();

// ─── Public Widget Config Delivery (For Embed Script) ─────────────────────────
// Accessible from any origin; cached via HTTP Cache-Control
router.get("/:id/config", getPublicWidgetConfig);

// ─── Authenticated Tenant CRUD & Snippet Management ───────────────────────────
router.get("/", requireAuth, validate({ query: widgetQuerySchema }), getWidgets);
router.post("/", requireAuth, validate({ body: createWidgetSchema }), createWidget);
router.get("/:id", requireAuth, getWidgetById);
router.patch("/:id", requireAuth, validate({ body: updateWidgetSchema }), updateWidget);
router.delete("/:id", requireAuth, deleteWidget);
router.get("/:id/snippet", requireAuth, getWidgetSnippet);

export default router;
