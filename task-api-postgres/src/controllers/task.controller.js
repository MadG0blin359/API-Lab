import asyncHandler from "../utils/async.handler.js";
import taskService from "../services/task.service.js";

export const getAllTasks = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await taskService.getAllTasks(
    userId,
    req.validatedQuery || req.query,
  );

  return res.status(200).json({
    status: "success",
    results: result.tasks.length,
    pagination: result.pagination,
    data: result.tasks,
  });
});

export const getTaskById = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const includeDeleted = req.query.includeDeleted === "true";
  const task = await taskService.getTaskById(userId, req.taskId, includeDeleted);

  return res.status(200).json({
    status: "success",
    data: task,
  });
});

export const createTask = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const newTask = await taskService.createTask(
    userId,
    req.validatedBody || req.body,
  );
  return res.status(201).json({ status: "success", data: newTask });
});

export const updateTaskById = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const task = await taskService.updateTaskById(
    userId,
    req.taskId,
    req.validatedBody || req.body,
  );

  return res.status(200).json({
    status: "success",
    data: task,
  });
});

export const deleteTaskById = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const permanent = req.query.permanent === "true";
  const result = await taskService.deleteTaskById(userId, req.taskId, permanent);

  return res.status(200).json({
    status: "success",
    message: result.message,
  });
});

export const restoreTaskById = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const restoredTask = await taskService.restoreTaskById(userId, req.taskId);

  return res.status(200).json({
    status: "success",
    message: "Task restored successfully.",
    data: restoredTask,
  });
});

export const bulkTasks = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await taskService.bulkTasks(
    userId,
    req.validatedBody || req.body,
  );

  return res.status(200).json({
    status: "success",
    message: `Bulk operation '${result.action}' processed successfully on ${result.affectedCount} task(s).`,
    data: result,
  });
});

export const getTaskStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const stats = await taskService.getTaskStats(userId);

  return res.status(200).json({
    status: "success",
    data: stats,
  });
});
