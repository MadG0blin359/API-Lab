import { Router } from "express";
import * as taskController from "../controllers/taskController.js";

const router = Router();

router.get("/", taskController.getAllTasks);
router.get("/:id", taskController.getOneTask);
router.post("/", taskController.createTask);

export default router;
