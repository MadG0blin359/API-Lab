import taskService from "../services/task.service.js";

export const getAllTasks = (req, res) => {
  const tasks = taskService.getAllTasks();

  return res.status(200).json({
    status: "success",
    totalCount: tasks.length,
    data: tasks,
  });
};

export const getTaskById = (req, res) => {
  const task = taskService.getTaskById(req.taskId);

  return res.status(200).json({
    status: "success",
    data: task,
  });
};

export const createTask = (req, res) => {
  const newTask = taskService.createTask(req.body);
  return res.status(201).json({ status: "success", data: newTask });
};

export const updateTaskById = (req, res) => {
  const { title, done } = req.body;
  const task = taskService.updateTaskById(req.taskId, title, done);

  return res.status(200).json({
    status: "success",
    data: task,
  });
};

export const deleteTaskById = (req, res) => {
  taskService.deleteTaskById(req.taskId);

  return res.status(204).json({
    status: "success",
    messsage: `Task with ID ${id} was deleted.`,
    data: null,
  });
};
