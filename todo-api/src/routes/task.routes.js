import { Router } from "express";
import * as taskController from "../controllers/task.controller.js";

const router = Router();

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
