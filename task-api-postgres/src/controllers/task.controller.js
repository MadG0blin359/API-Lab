import asyncHandler from "../utils/async.handler.js";
import taskService from "../services/task.service.js";

export const getAllTasks = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const tasks = await taskService.getAllTasks(userId, req.query);

  return res.status(200).json({
    status: "success",
    results: tasks.length,
    data: tasks,
  });
});

export const getTaskById = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const task = await taskService.getTaskById(userId, req.taskId);

  return res.status(200).json({
    status: "success",
    data: task,
  });
});

export const createTask = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const newTask = await taskService.createTask(userId, req.body);
  return res.status(201).json({ status: "success", data: newTask });
});

export const updateTaskById = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const task = await taskService.updateTaskById(userId, req.taskId, req.body);

  return res.status(200).json({
    status: "success",
    data: task,
  });
});

export const deleteTaskById = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  await taskService.deleteTaskById(userId, req.taskId);

  return res.status(200).json({
    status: "success",
    message: "Task deleted successfully.",
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
