import asyncHandler from "../utils/async.handler.js";
import taskService from "../services/task.service.js";
import redisClient from "../config/redis.client.js";

export const getAPIEndpoints = (req, res) =>
  res.status(200).json({
    status: "success",
    data: {
      name: "Task Manager API",
      version: "2.0.0",
      description:
        "Production-grade Task Management API with Postgres, Redis, and Supabase Auth",
      endpoints: {
        authentication: [
          "GET  /auth/csrf",
          "POST /auth/signup",
          "POST /auth/login",
          "POST /auth/logout",
          "POST /auth/refresh",
        ],
        tasks: [
          "GET    /tasks (filters: search, isComplete, priority, tag, status, sortBy, sortOrder, limit, offset, includeDeleted)",
          "POST   /tasks",
          "POST   /tasks/bulk",
          "GET    /tasks/stats",
          "GET    /tasks/:id",
          "PUT    /tasks/:id",
          "DELETE /tasks/:id (soft delete, ?permanent=true for hard delete)",
          "POST   /tasks/:id/restore",
        ],
        user: ["GET /user/public", "GET /user/profile"],
        meta: ["GET /", "GET /health", "GET /docs"],
      },
    },
  });

export const getServerHealth = asyncHandler(async (req, res) => {
  const checkTime = new Date().toISOString();
  const uptimeSeconds = Math.floor(process.uptime());

  // 1. PostgreSQL check
  let dbStatus = { status: "down", latencyMs: null };
  try {
    const dbHealth = await taskService.getHealth();
    dbStatus = {
      status: dbHealth.connected ? "up" : "down",
      latencyMs: dbHealth.latencyMs,
    };
  } catch (error) {
    dbStatus = { status: "down", error: error.message };
  }

  // 2. Redis check
  let redisStatus = { status: "down", latencyMs: null };
  try {
    if (redisClient.isOpen) {
      const start = Date.now();
      await redisClient.ping();
      redisStatus = {
        status: "up",
        latencyMs: Date.now() - start,
      };
    } else {
      redisStatus = {
        status: "disconnected",
        error: "Redis client connection is not open",
      };
    }
  } catch (error) {
    redisStatus = { status: "down", error: error.message };
  }

  // 3. Process memory usage
  const memoryUsage = process.memoryUsage();
  const memory = {
    rssMb: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
    heapUsedMb: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
    heapTotalMb: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100,
  };

  const isHealthy = dbStatus.status === "up" && redisStatus.status === "up";
  const statusCode = isHealthy ? 200 : 503;

  return res.status(statusCode).json({
    status: isHealthy ? "healthy" : "degraded",
    timestamp: checkTime,
    uptime: `${uptimeSeconds}s`,
    environment: process.env.NODE_ENV || "development",
    version: process.env.npm_package_version || "2.0.0",
    nodeVersion: process.version,
    memory,
    services: {
      database: dbStatus,
      redis: redisStatus,
    },
  });
});
