import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import {
  validateEmailPassword,
  validateAuthorizationHeader,
} from "../validators/auth.validator.js";
import * as authMiddleware from "../middlewares/authenticate.user.js";
import { logout } from "../controllers/user.controller.js";

const router = Router();

router
  .post("/signup", validateEmailPassword, authController.signup)
  .post("/login", validateEmailPassword, authController.login);

router.post(
  "/logout",
  validateAuthorizationHeader,
  authMiddleware.authenticateUser,
  logout,
);

export default router;
