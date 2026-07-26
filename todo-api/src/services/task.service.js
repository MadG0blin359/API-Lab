import AppError from "../utils/app.error.js";
import taskRepository from "../repositories/task.repository.js";

class TaskService {
  constructor() {
    this.tasks = taskRepository.findAll();
  }

  getAllTasks() {
    if (this.tasks.length === 0) throw new AppError(404, "No tasks found!");

    return this.tasks;
  }

  getTaskById(id) {
    const idx = taskRepository.findById(id);
    if (idx === -1) throw new AppError(404, `No task was found with ID ${id}.`);

    return this.tasks[idx];
  }

  createTask(title) {
    if (!title || typeof title !== "string" || title.trim() === "")
      throw new AppError(400, "Please provide a valid title.");

    const nextId =
      this.tasks.length > 0
        ? Math.max(...this.tasks.map((task) => task.id)) + 1
        : 1;

    const newTask = {
      id: nextId,
      title,
      done: false,
    };

    return taskRepository.create(newTask);
  }

  updateTaskById(id, title, done) {
    if (title === undefined && done === undefined)
      throw new AppError(
        400,
        "Please provide a title and/or done status to update task.",
      );

    const idx = taskRepository.findById(id);

    if (idx === -1) throw new AppError(404, `No task was found with ID ${id}.`);

    return taskRepository.update(idx, { title, done });
  }

  deleteTaskById(id) {
    const idx = taskRepository.findById(id);

    if (idx === -1) throw new AppError(404, `No task was found with ID ${id}.`);

    taskRepository.delete(idx);
  }
}

export default new TaskService();
