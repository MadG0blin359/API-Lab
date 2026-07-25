import { Router } from "express";
import { validateTaskID } from "../validators/task.params.validator.js";
import * as taskController from "../controllers/task.controller.js";

const router = Router();

router.param("id", validateTaskID);

router
  .route("/")
  .get(taskController.getAllTasks)
  .post(taskController.createTask);

router
  .route("/:id")
  .get(taskController.getOneTask)
  .put(taskController.updateOne)
  .delete(taskController.deleteOne);

export default router;
