import { Request, Response } from "express";
import { db } from "../config/firebase.js";

/**
 * Basic liveness probe.
 */
export const getHealth = (req: Request, res: Response): void => {
  res.status(200).json({
    success: true,
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
};

/**
 * Deep readiness probe verifying Firestore connectivity.
 */
export const getReadiness = async (req: Request, res: Response): Promise<void> => {
  try {
    // Attempt a lightweight read against Firestore
    await db.collection("widgets").limit(1).get();

    res.status(200).json({
      success: true,
      status: "ready",
      checks: {
        server: "healthy",
        firestore: "connected",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(503).json({
      success: false,
      status: "unhealthy",
      checks: {
        server: "healthy",
        firestore: `Failed: ${err.message || "Unknown error connecting to Firestore"}`,
      },
      timestamp: new Date().toISOString(),
    });
  }
};
