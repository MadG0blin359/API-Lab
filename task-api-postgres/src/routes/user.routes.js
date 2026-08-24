import { Router } from "express";
import * as userController from "../controllers/user.controller.js";
import { validateAuthorizationHeader } from "../validators/auth.validator.js";
import { authenticateUser } from "../middlewares/authenticate.user.js";

const router = Router();

router.get("/public", userController.getPublicInfo);

router
  .use(validateAuthorizationHeader, authenticateUser)
  .get("/profile", userController.getProfile)
  .post("/logout", userController.logout);

export default router;
