import { Router } from "express";
import * as metaController from "../controllers/meta.controller.js";

const router = Router();

router.get("/", metaController.getAPIEndpoints);
router.get("/health", metaController.getServerHealth);
router.get("/stats", metaController.getTaskStats);

export default router;
