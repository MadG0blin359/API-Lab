import { Router } from "express";
import { validateTaskID } from "../validators/task.params.validator.js";
import * as taskController from "../controllers/task.controller.js";
import { validateAccessToken } from "../validators/auth.validator.js";
import { authenticateUser } from "../middlewares/authenticate.user.js";

const router = Router();

// All task routes require authentication
router.use(validateAccessToken, authenticateUser);

router.param("id", validateTaskID);

router.get("/stats", taskController.getTaskStats);

router
  .route("/")
  .get(taskController.getAllTasks)
  .post(taskController.createTask);

router
  .route("/:id")
  .get(taskController.getTaskById)
  .put(taskController.updateTaskById)
  .delete(taskController.deleteTaskById);

export default router;
