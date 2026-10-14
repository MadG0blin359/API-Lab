import { Router } from "express";
import {
  getItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem,
} from "../controllers/item.controller.js";
import { requireAuth, optionalAuth } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createItemSchema,
  updateItemSchema,
  itemQuerySchema,
  itemIdParamSchema,
} from "../validators/item.validator.js";

const router = Router();

// Public / optionally authenticated list and get
router.get("/", optionalAuth, validate({ query: itemQuerySchema }), getItems);
router.get("/:id", optionalAuth, validate({ params: itemIdParamSchema }), getItemById);

// Protected routes (requires Supabase Auth token)
router.post(
  "/",
  requireAuth,
  validate({ body: createItemSchema }),
  createItem
);

router.patch(
  "/:id",
  requireAuth,
  validate({ params: itemIdParamSchema, body: updateItemSchema }),
  updateItem
);

router.delete(
  "/:id",
  requireAuth,
  validate({ params: itemIdParamSchema }),
  deleteItem
);

export default router;
