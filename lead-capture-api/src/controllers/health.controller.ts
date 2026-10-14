import { Request, Response } from "express";
import { supabase } from "../config/supabase.js";

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
 * Deep readiness probe verifying Supabase connectivity.
 */
export const getReadiness = async (req: Request, res: Response): Promise<void> => {
  try {
    // Attempt a lightweight check against Supabase
    const { error } = await supabase.from("items").select("id").limit(1);

    // PGRST205 / 42P01: table doesn't exist yet, but Supabase API is fully reachable
    const tableMissing = error && (error.code === "PGRST205" || error.code === "42P01");
    const isConnected = !error || tableMissing || error.code === "PGRST116" || error.code === "PGRST204";

    if (!isConnected && error) {
      res.status(503).json({
        success: false,
        status: "unhealthy",
        checks: {
          server: "healthy",
          supabase: `Failed: ${error.message}`,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(200).json({
      success: true,
      status: "ready",
      checks: {
        server: "healthy",
        supabase: tableMissing
          ? "connected (notice: 'items' table not created yet, run src/config/schema.sql)"
          : "connected",
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(503).json({
      success: false,
      status: "unhealthy",
      error: err.message || "Unknown error connecting to Supabase",
      timestamp: new Date().toISOString(),
    });
  }
};
