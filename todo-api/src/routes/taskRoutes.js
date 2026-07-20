import { Router } from "express";
import * as taskController from "../controllers/taskController.js";

const router = Router();

router.get("/", taskController.getAllTasks);
router.get("/:id", taskController.getOneTask);

export default router;
