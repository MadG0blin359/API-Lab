import { initializeApp, cert, getApps, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";
import fs from "node:fs";
import path from "node:path";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

/**
 * Initialize Firebase Admin SDK.
 * Supports:
 * 1. Explicit Service Account credentials via env vars (Render / Production)
 * 2. Service Account JSON file path (FIREBASE_SERVICE_ACCOUNT_PATH or GOOGLE_APPLICATION_CREDENTIALS)
 * 3. Graceful fallback for local development before credentials are configured
 */
function initFirebase(): App {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return existingApps[0]!;
  }

  // 1. Check direct env vars
  if (env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
    const formattedKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");
    logger.info(`🔥 Initializing Firebase Admin with service account: ${env.FIREBASE_CLIENT_EMAIL}`);
    return initializeApp({
      credential: cert({
        projectId: env.FIREBASE_PROJECT_ID,
        clientEmail: env.FIREBASE_CLIENT_EMAIL,
        privateKey: formattedKey,
      }),
      projectId: env.FIREBASE_PROJECT_ID,
    });
  }

  // 2. Check service account file path, Render Secret File, or default local serviceAccountKey.json
  const defaultLocalKey = path.join(process.cwd(), "serviceAccountKey.json");
  const renderSecretKey = "/etc/secrets/serviceAccountKey.json";
  const keyPath =
    env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS ||
    (fs.existsSync(renderSecretKey) ? renderSecretKey : undefined) ||
    (fs.existsSync(defaultLocalKey) ? defaultLocalKey : undefined);

  if (keyPath) {
    const resolvedPath = path.isAbsolute(keyPath)
      ? keyPath
      : path.join(process.cwd(), keyPath);

    if (fs.existsSync(resolvedPath)) {
      try {
        const keyFile = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));
        logger.info(`🔥 Initializing Firebase Admin with credentials file: ${resolvedPath}`);
        return initializeApp({
          credential: cert(keyFile),
          projectId: keyFile.project_id || env.FIREBASE_PROJECT_ID,
        });
      } catch (err: any) {
        logger.warn(`⚠️ Failed reading service account key from ${resolvedPath}: ${err.message}`);
      }
    }
  }

  // 3. Graceful fallback for development / testing
  logger.warn(
    `⚠️ No Firebase Service Account credentials provided. Initializing with Project ID "${env.FIREBASE_PROJECT_ID}". ` +
      `Set FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in .env for full Firestore and Auth access.`
  );

  return initializeApp({
    projectId: env.FIREBASE_PROJECT_ID,
  });
}

export const firebaseApp: App = initFirebase();
export const db: Firestore = getFirestore(firebaseApp);
export const auth: Auth = getAuth(firebaseApp);

export default firebaseApp;
