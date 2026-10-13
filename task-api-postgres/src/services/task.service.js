import AppError from "../utils/app.error.js";
import taskRepository from "../repositories/task.repository.js";

class TaskService {
  async getAllTasks(userId, queryOptions = {}) {
    // Normalize parameters
    const isCompleteValue =
      queryOptions.is_complete !== undefined
        ? queryOptions.is_complete
        : queryOptions.isComplete;

    const normalizedOptions = {
      search: queryOptions.search,
      is_complete: isCompleteValue,
      priority: queryOptions.priority,
      tag: queryOptions.tag,
      status: queryOptions.status,
      sortBy: queryOptions.sortBy || "updated_at",
      sortOrder: queryOptions.sortOrder || "desc",
      limit: queryOptions.limit !== undefined ? parseInt(queryOptions.limit, 10) : 20,
      offset: queryOptions.offset !== undefined ? parseInt(queryOptions.offset, 10) : 0,
      includeDeleted: queryOptions.includeDeleted === true || queryOptions.includeDeleted === "true",
    };

    const { tasks, total, limit, offset } = await taskRepository.findAll(
      userId,
      normalizedOptions,
    );

    return {
      tasks,
      pagination: {
        total,
        count: tasks.length,
        limit,
        offset,
        totalPages: Math.ceil(total / limit) || 0,
        page: Math.floor(offset / limit) + 1,
      },
    };
  }

  async getTaskById(userId, id, includeDeleted = false) {
    const task = await taskRepository.findById(userId, id, includeDeleted);
    if (!task) {
      throw new AppError(404, `No task was found with ID ${id}.`);
    }
    return task;
  }

  async getTaskStats(userId) {
    const stats = await taskRepository.getStats(userId);
    if (!stats) {
      throw new AppError(500, "Failed to compute database statistics.");
    }
    return stats;
  }

  async createTask(userId, taskData) {
    const { title, description = null, priority = "medium", tags = [] } = taskData;
    const dueDate = taskData.due_date || taskData.dueDate || null;

    if (!title || typeof title !== "string" || title.trim() === "") {
      throw new AppError(400, "Please provide a valid title.");
    }

    return await taskRepository.create(userId, {
      title: title.trim(),
      description: description ? description.trim() : null,
      priority,
      due_date: dueDate,
      tags: Array.isArray(tags) ? tags : [],
    });
  }

  async updateTaskById(userId, id, taskData) {
    const updatePayload = {};

    if (taskData.title !== undefined) {
      updatePayload.title = taskData.title.trim();
    }
    if (taskData.description !== undefined) {
      updatePayload.description = taskData.description !== null ? taskData.description.trim() : null;
    }
    if (taskData.is_complete !== undefined) {
      updatePayload.is_complete = taskData.is_complete;
    } else if (taskData.isComplete !== undefined) {
      updatePayload.is_complete = taskData.isComplete;
    }
    if (taskData.priority !== undefined) {
      updatePayload.priority = taskData.priority;
    }
    if (taskData.due_date !== undefined) {
      updatePayload.due_date = taskData.due_date;
    } else if (taskData.dueDate !== undefined) {
      updatePayload.due_date = taskData.dueDate;
    }
    if (taskData.tags !== undefined) {
      updatePayload.tags = Array.isArray(taskData.tags) ? taskData.tags : [];
    }

    if (Object.keys(updatePayload).length === 0) {
      throw new AppError(
        400,
        "Please provide at least one valid field to update.",
      );
    }

    const updatedTask = await taskRepository.update(userId, id, updatePayload);

    if (!updatedTask) {
      throw new AppError(404, `No active task was found with ID ${id}.`);
    }

    return updatedTask;
  }

  async deleteTaskById(userId, id, permanent = false) {
    if (permanent) {
      const result = await taskRepository.permanentDelete(userId, id);
      if (!result) throw new AppError(404, `No task was found with ID ${id}.`);
      return { message: "Task permanently deleted." };
    }

    const result = await taskRepository.softDelete(userId, id);
    if (!result) {
      throw new AppError(404, `No active task was found with ID ${id}.`);
    }
    return { message: "Task moved to trash (soft deleted)." };
  }

  async restoreTaskById(userId, id) {
    const task = await taskRepository.restore(userId, id);
    if (!task) {
      throw new AppError(404, `No deleted task was found with ID ${id} to restore.`);
    }
    return task;
  }

  async bulkTasks(userId, { taskIds, action, priority }) {
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      throw new AppError(400, "Please provide an array of task IDs.");
    }

    const updatedTasks = await taskRepository.bulkUpdate(
      userId,
      taskIds,
      action,
      priority,
    );

    return {
      action,
      affectedCount: updatedTasks.length,
      tasks: updatedTasks,
    };
  }

  async getHealth() {
    return await taskRepository.health();
  }
}

export default new TaskService();
