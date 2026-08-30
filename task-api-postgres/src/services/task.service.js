import AppError from "../utils/app.error.js";
import taskRepository from "../repositories/task.repository.js";

class TaskService {
  async getAllTasks(userId, reqOptions) {
    const { is_complete, search, limit, offset } = reqOptions;
    const isCompleteQuery = is_complete;
    let dataArr;

    if (limit !== undefined && offset !== undefined) {
      const limitNum = parseInt(limit, 10);
      const offsetNum = parseInt(offset, 10);

      // Validate that they are valid, non-negative numbers
      if (
        isNaN(limitNum) ||
        isNaN(offsetNum) ||
        limitNum <= 0 ||
        offsetNum < 0
      ) {
        throw new AppError(400, "Limit must be > 0 and offset must be >= 0.");
      }

      dataArr = await taskRepository.paginate(userId, limitNum, offsetNum);
    } else if (search !== undefined) {
      if (typeof search !== "string" || search.trim() === "") {
        throw new AppError(400, "Search query must be a valid string.");
      }
      dataArr = await taskRepository.search(userId, search.trim());
    } else if (isCompleteQuery !== undefined) {
      if (isCompleteQuery !== "true" && isCompleteQuery !== "false") {
        throw new AppError(
          400,
          "The isComplete parameter must be 'true' or 'false'.",
        );
      }

      const isCompleteBool = isCompleteQuery === "true";

      dataArr = await taskRepository.findByStatus(userId, isCompleteBool);
    } else {
      dataArr = await taskRepository.findAll(userId);
    }

    if (!dataArr || dataArr.length === 0)
      throw new AppError(404, "No tasks found!");

    return dataArr;
  }

  async getTaskById(userId, id) {
    const dataObj = await taskRepository.findById(userId, id);
    if (!dataObj) throw new AppError(404, `No task was found with ID ${id}.`);

    return dataObj;
  }

  async getTaskStats(userId) {
    const stats = await taskRepository.getStats(userId);

    if (!stats) {
      throw new AppError(500, "Failed to compute database statistics.");
    }

    return stats;
  }

  async createTask(userId, newTask) {
    const { title, description = null } = newTask;
    if (!title || typeof title !== "string" || title.trim() === "")
      throw new AppError(400, "Please provide a valid title.");

    const taskData = {
      title,
      description,
    };

    return await taskRepository.create(userId, taskData);
  }

  async updateTaskById(userId, id, taskData) {
    const { title, description, is_complete } = taskData;

    if (
      title === undefined &&
      description === undefined &&
      is_complete === undefined
    )
      throw new AppError(
        400,
        "Please provide a title, description and/or is_complete status to update task.",
      );

    const updatedTask = await taskRepository.update(userId, id, {
      title,
      description,
      is_complete,
    });

    if (!updatedTask)
      throw new AppError(404, `No task was found with ID ${id}.`);

    return updatedTask;
  }

  async deleteTaskById(userId, id) {
    const result = await taskRepository.delete(userId, id);
    if (!result) throw new AppError(404, `No task was found with ID ${id}.`);
    return true;
  }

  async getHealth() {
    const result = await taskRepository.health();
    if (!result) throw new AppError(500, "Database health check failed.");
    return true;
  }
}

export default new TaskService();
