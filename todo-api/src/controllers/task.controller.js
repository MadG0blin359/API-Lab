import taskService from "../services/task.service.js";
import asyncHandler from "../utils/async.handler.js";

export const getAllTasks = asyncHandler(async (req, res) => {
  const { isComplete, search } = req.query;
  const tasks = await taskService.getAllTasks({ isComplete, search });

  return res.status(200).json({
    status: "success",
    totalCount: tasks.length,
    data: tasks,
  });
});

export const getTaskById = asyncHandler(async (req, res) => {
  const task = await taskService.getTaskById(req.taskId);

  return res.status(200).json({
    status: "success",
    data: task,
  });
});

export const createTask = asyncHandler(async (req, res) => {
  const newTask = await taskService.createTask(req.body);
  return res.status(201).json({ status: "success", data: newTask });
});

export const updateTaskById = asyncHandler(async (req, res) => {
  const task = await taskService.updateTaskById(req.taskId, req.body);

  return res.status(200).json({
    status: "success",
    data: task,
  });
});

export const deleteTaskById = asyncHandler(async (req, res) => {
  await taskService.deleteTaskById(req.taskId);

  return res.status(200).json({
    status: "success",
    message: `Task with ID ${req.taskId} was deleted.`,
    data: null,
  });
});
