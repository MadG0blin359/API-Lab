import taskService from "../services/task.service.js";
import asyncHandler from "../utils/async.handler.js";

export const getAllTasks = asyncHandler((req, res) => {
  const tasks = taskService.getAllTasks();

  return res.status(200).json({
    status: "success",
    totalCount: tasks.length,
    data: tasks,
  });
});

export const getTaskById = asyncHandler((req, res) => {
  const task = taskService.getTaskById(req.taskId);

  return res.status(200).json({
    status: "success",
    data: task,
  });
});

export const createTask = asyncHandler((req, res) => {
  const newTask = taskService.createTask(req.body.title);
  return res.status(201).json({ status: "success", data: newTask });
});

export const updateTaskById = asyncHandler((req, res) => {
  const { title, done } = req.body;
  const task = taskService.updateTaskById(req.taskId, title, done);

  return res.status(200).json({
    status: "success",
    data: task,
  });
});

export const deleteTaskById = asyncHandler((req, res) => {
  taskService.deleteTaskById(req.taskId);

  return res.status(204).json({
    status: "success",
    message: `Task with ID ${req.taskId} was deleted.`,
    data: null,
  });
});
