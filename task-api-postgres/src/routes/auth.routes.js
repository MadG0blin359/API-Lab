import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import {
  validateEmailPassword,
  validateAuthorizationHeader,
  validateRefreshToken,
} from "../validators/auth.validator.js";
import * as authMiddleware from "../middlewares/authenticate.user.js";
import { logout } from "../controllers/user.controller.js";
import { attachCsrfToken } from "../middlewares/csrf.middleware.js";

const router = Router();

router
  .get("/csrf", attachCsrfToken, authController.sendCsrfToken)
  .post(
    "/signup",
    validateEmailPassword,
    attachCsrfToken,
    authController.signup,
  )
  .post("/login", validateEmailPassword, attachCsrfToken, authController.login)
  .post(
    "/logout",
    validateAuthorizationHeader,
    authMiddleware.authenticateUser,
    logout,
  )
  .post(
    "/refresh",
    validateRefreshToken,
    attachCsrfToken,
    authController.refreshSession,
  );

export default router;
