import AppError from "../utils/app.error.js";
import taskRepository from "../repositories/task.repository.js";

class TaskService {
  getAllTasks(isCompleteQuery) {
    let dataArr;
    if (isCompleteQuery !== undefined) {
      if (isCompleteQuery !== "true" && isCompleteQuery !== "false") {
        throw new AppError(
          400,
          "The isComplete parameter must be 'true' or 'false'.",
        );
      }

      const isCompleteBool = isCompleteQuery === "true";

      dataArr = taskRepository.findByStatus(isCompleteBool);
    } else {
      dataArr = taskRepository.findAll();
    }

    if (!dataArr) throw new AppError(404, "No tasks found!");

    return dataArr;
  }

  getTaskById(id) {
    const dataObj = taskRepository.findById(id);
    if (!dataObj) throw new AppError(404, `No task was found with ID ${id}.`);

    return dataObj;
  }

  createTask(newTask) {
    const { title, description = null } = newTask;
    if (!title || typeof title !== "string" || title.trim() === "")
      throw new AppError(400, "Please provide a valid title.");

    const taskData = {
      title,
      description,
    };

    return taskRepository.create(taskData);
  }

  updateTaskById(id, taskData) {
    const { title, description, isComplete } = taskData;

    if (
      title === undefined &&
      description === undefined &&
      isComplete === undefined
    )
      throw new AppError(
        400,
        "Please provide a title, description and/or isComplete status to update task.",
      );

    const updatedTask = taskRepository.update(id, {
      title,
      description,
      isComplete,
    });

    if (!updatedTask)
      throw new AppError(404, `No task was found with ID ${id}.`);

    return updatedTask;
  }

  deleteTaskById(id) {
    const result = taskRepository.delete(id);
    if (!result) throw new AppError(404, `No task was found with ID ${id}.`);
    return true;
  }
}

export default new TaskService();
