import asyncHandler from "../utils/async.handler.js";
import taskService from "../services/task.service.js";

export const getAPIEndpoints = (req, res) =>
  res.status(200).json({
    status: "success",
    data: {
      name: "Task API",
      version: "1.0",
      endpoints: ["/tasks", "/tasks/stats", "/health", "/docs"],
    },
  });

export const getServerHealth = asyncHandler(async (req, res) => {
  await taskService.getHealth();

  res.status(200).json({
    status: "success",
    message: "Server is up and running.",
  });
});
