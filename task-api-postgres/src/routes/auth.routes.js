import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import {
  validateEmailPassword,
  validateAccessToken,
  validateRefreshToken,
} from "../validators/auth.validator.js";
import * as authMiddleware from "../middlewares/authenticate.user.js";
import { logout } from "../controllers/user.controller.js";
import { attachCsrfToken } from "../middlewares/csrf.middleware.js";
import { authRateLimiter } from "../middlewares/rate.limit.middleware.js";

const router = Router();

router
  .get("/csrf", attachCsrfToken, authController.sendCsrfToken)
  .post(
    "/signup",
    authRateLimiter,
    validateEmailPassword,
    attachCsrfToken,
    authController.signup,
  )
  .post(
    "/login",
    authRateLimiter,
    validateEmailPassword,
    attachCsrfToken,
    authController.login,
  )
  .post("/logout", validateAccessToken, authMiddleware.authenticateUser, logout)
  .post(
    "/refresh",
    authRateLimiter,
    validateRefreshToken,
    attachCsrfToken,
    authController.refreshSession,
  );

export default router;
