import { auth } from "../config/firebase.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";
import { SignUpInput, SignInInput } from "../validators/auth.validator.js";
import { logger } from "../utils/logger.js";

export const authService = {
  /**
   * Register a new user in Firebase Auth.
   */
  async signUp(input: SignUpInput) {
    try {
      const userRecord = await auth.createUser({
        email: input.email,
        password: input.password,
        displayName: input.fullName,
      });

      // Generate a custom authentication token for immediate client sign-in
      const customToken = await auth.createCustomToken(userRecord.uid);

      return {
        user: {
          id: userRecord.uid,
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
          createdAt: userRecord.metadata.creationTime,
        },
        token: customToken,
      };
    } catch (error: any) {
      if (error.code === "auth/email-already-exists") {
        throw new AppError(409, "An account with this email address already exists.");
      }
      if (error.code === "auth/invalid-password") {
        throw new AppError(400, "Password must be at least 6 characters long.");
      }
      throw new AppError(400, error.message || "Failed to create user account.");
    }
  },

  /**
   * Authenticate user with email and password.
   * If FIREBASE_API_KEY is configured, uses Firebase Identity Toolkit REST API
   * to verify password and return standard ID tokens.
   * Otherwise verifies account existence and generates a Firebase custom token.
   */
  async signIn(input: SignInInput) {
    // 1. If Firebase Web API Key is available, authenticate via Identity Toolkit REST
    if (env.FIREBASE_API_KEY) {
      try {
        const response = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${env.FIREBASE_API_KEY}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: input.email,
              password: input.password,
              returnSecureToken: true,
            }),
          }
        );

        const data = (await response.json()) as any;

        if (!response.ok) {
          const errCode = data.error?.message;
          if (
            errCode === "EMAIL_NOT_FOUND" ||
            errCode === "INVALID_PASSWORD" ||
            errCode === "INVALID_LOGIN_CREDENTIALS"
          ) {
            throw new AppError(401, "Invalid email or password.");
          }
          throw new AppError(401, data.error?.message || "Authentication failed.");
        }

        return {
          user: {
            id: data.localId,
            uid: data.localId,
            email: data.email,
            displayName: data.displayName,
          },
          session: {
            idToken: data.idToken,
            refreshToken: data.refreshToken,
            expiresIn: data.expiresIn,
          },
          token: data.idToken,
        };
      } catch (err: any) {
        if (err instanceof AppError) throw err;
        logger.error(`[AuthService] Identity Toolkit call failed: ${err.message}`);
      }
    }

    // 2. Server-side fallback: check user existence in Firebase Auth & mint custom token
    try {
      const userRecord = await auth.getUserByEmail(input.email);
      const customToken = await auth.createCustomToken(userRecord.uid);

      return {
        user: {
          id: userRecord.uid,
          uid: userRecord.uid,
          email: userRecord.email,
          displayName: userRecord.displayName,
        },
        token: customToken,
        message:
          "Custom token generated. Exchange for ID token via signInWithCustomToken on client or configure FIREBASE_API_KEY.",
      };
    } catch (error: any) {
      if (error.code === "auth/user-not-found") {
        throw new AppError(401, "Invalid email or password.");
      }
      throw new AppError(401, error.message || "Authentication failed.");
    }
  },

  /**
   * Revoke active sessions for a user.
   */
  async signOut(token: string) {
    try {
      const decoded = await auth.verifyIdToken(token);
      await auth.revokeRefreshTokens(decoded.uid);
      return true;
    } catch {
      // Safe fallback if token already expired
      return true;
    }
  },

  /**
   * Generate password reset link.
   */
  async resetPassword(email: string) {
    try {
      const link = await auth.generatePasswordResetLink(email);
      logger.info(`[AuthService] Password reset link generated for ${email}: ${link}`);
      return true;
    } catch (error: any) {
      // Return true to avoid user enumeration
      logger.warn(`[AuthService] Password reset failed for ${email}: ${error.message}`);
      return true;
    }
  },
};

export default authService;
