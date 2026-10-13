import { Router } from "express";
import { validateTaskID } from "../validators/task.params.validator.js";
import * as taskController from "../controllers/task.controller.js";
import { validateAccessToken } from "../validators/auth.validator.js";
import { authenticateUser } from "../middlewares/authenticate.user.js";
import {
  createTaskSchema,
  updateTaskSchema,
  taskQuerySchema,
  bulkTaskSchema,
  validateRequest,
} from "../validators/task.validator.js";

const router = Router();

// All task routes require authentication
router.use(validateAccessToken, authenticateUser);

// Explicit routes before parameter matchers
router.get("/stats", taskController.getTaskStats);

router.post(
  "/bulk",
  validateRequest(bulkTaskSchema, "body"),
  taskController.bulkTasks,
);

router
  .route("/")
  .get(validateRequest(taskQuerySchema, "query"), taskController.getAllTasks)
  .post(validateRequest(createTaskSchema, "body"), taskController.createTask);

// Parameter validation
router.param("id", validateTaskID);

router.post("/:id/restore", taskController.restoreTaskById);

router
  .route("/:id")
  .get(taskController.getTaskById)
  .put(validateRequest(updateTaskSchema, "body"), taskController.updateTaskById)
  .delete(taskController.deleteTaskById);

export default router;
