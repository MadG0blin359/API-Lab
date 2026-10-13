import db from "../config/database.js";

class TaskRepository {
  async findAll(userId, options = {}) {
    const {
      search,
      is_complete,
      priority,
      tag,
      status,
      sortBy = "updated_at",
      sortOrder = "desc",
      limit = 20,
      offset = 0,
      includeDeleted = false,
    } = options;

    const conditions = ["user_id = $1"];
    const params = [userId];
    let paramIndex = 2;

    if (!includeDeleted) {
      conditions.push("deleted_at IS NULL");
    }

    if (is_complete !== undefined) {
      conditions.push(`is_complete = $${paramIndex}`);
      params.push(is_complete);
      paramIndex++;
    }

    if (priority) {
      conditions.push(`priority = $${paramIndex}`);
      params.push(priority);
      paramIndex++;
    }

    if (tag) {
      conditions.push(`$${paramIndex} = ANY(tags)`);
      params.push(tag);
      paramIndex++;
    }

    if (status) {
      if (status === "completed") {
        conditions.push("is_complete = true");
      } else if (status === "pending") {
        conditions.push("is_complete = false");
      } else if (status === "overdue") {
        conditions.push(
          "is_complete = false AND due_date IS NOT NULL AND due_date < CURRENT_TIMESTAMP",
        );
      }
    }

    if (search) {
      const safePattern = `%${search}%`;
      conditions.push(
        `(title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`,
      );
      params.push(safePattern);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Whitelist sort fields to prevent SQL injection
    const validSortFields = {
      created_at: "created_at",
      updated_at: "updated_at",
      due_date: "due_date",
      title: "title",
      priority: `CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END`,
    };

    const sortColumn = validSortFields[sortBy] || "updated_at";
    const direction = sortOrder.toUpperCase() === "ASC" ? "ASC" : "DESC";

    const query = `
      SELECT *, COUNT(*) OVER() AS total_count
      FROM tasks
      ${whereClause}
      ORDER BY ${sortColumn} ${direction} NULLS LAST
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const result = await db.query(query, params);
    const total =
      result.rows.length > 0 ? parseInt(result.rows[0].total_count, 10) : 0;
    const tasks = result.rows.map((row) => {
      const { total_count, ...task } = row;
      return task;
    });

    return { tasks, total, limit, offset };
  }

  async findById(userId, id, includeDeleted = false) {
    const condition = includeDeleted ? "" : "AND deleted_at IS NULL";
    const result = await db.query(
      `SELECT * FROM tasks WHERE id = $1 AND user_id = $2 ${condition}`,
      [id, userId],
    );
    return result.rows[0];
  }

  async create(userId, taskData) {
    const {
      title,
      description = null,
      priority = "medium",
      due_date = null,
      tags = [],
    } = taskData;

    const result = await db.query(
      `INSERT INTO tasks (user_id, title, description, is_complete, priority, due_date, tags)
       VALUES ($1, $2, $3, false, $4, $5, $6)
       RETURNING *`,
      [userId, title, description, priority, due_date, tags],
    );

    return result.rows[0];
  }

  async update(userId, id, taskData) {
    const fields = [];
    const values = [];
    let idx = 1;

    for (const [key, value] of Object.entries(taskData)) {
      if (value !== undefined) {
        fields.push(`${key} = $${idx}`);
        values.push(value);
        idx++;
      }
    }

    if (fields.length === 0) return null;

    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id, userId);

    const query = `
      UPDATE tasks
      SET ${fields.join(", ")}
      WHERE id = $${idx} AND user_id = $${idx + 1} AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await db.query(query, values);
    if (result.rowCount === 0) return null;
    return result.rows[0];
  }

  async softDelete(userId, id) {
    const result = await db.query(
      `UPDATE tasks
       SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
       RETURNING *`,
      [id, userId],
    );
    return result.rowCount > 0;
  }

  async restore(userId, id) {
    const result = await db.query(
      `UPDATE tasks
       SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NOT NULL
       RETURNING *`,
      [id, userId],
    );
    if (result.rowCount === 0) return null;
    return result.rows[0];
  }

  async permanentDelete(userId, id) {
    const result = await db.query(
      "DELETE FROM tasks WHERE id = $1 AND user_id = $2",
      [id, userId],
    );
    return result.rowCount > 0;
  }

  async bulkUpdate(userId, taskIds, action, priority) {
    let query = "";
    const params = [taskIds, userId];

    switch (action) {
      case "complete":
        query = `
          UPDATE tasks
          SET is_complete = true, updated_at = CURRENT_TIMESTAMP
          WHERE id = ANY($1::int[]) AND user_id = $2 AND deleted_at IS NULL
          RETURNING *`;
        break;
      case "incomplete":
        query = `
          UPDATE tasks
          SET is_complete = false, updated_at = CURRENT_TIMESTAMP
          WHERE id = ANY($1::int[]) AND user_id = $2 AND deleted_at IS NULL
          RETURNING *`;
        break;
      case "delete":
        query = `
          UPDATE tasks
          SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = ANY($1::int[]) AND user_id = $2 AND deleted_at IS NULL
          RETURNING *`;
        break;
      case "restore":
        query = `
          UPDATE tasks
          SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
          WHERE id = ANY($1::int[]) AND user_id = $2 AND deleted_at IS NOT NULL
          RETURNING *`;
        break;
      case "permanent_delete":
        query = `
          DELETE FROM tasks
          WHERE id = ANY($1::int[]) AND user_id = $2
          RETURNING *`;
        break;
      case "set_priority":
        params.push(priority);
        query = `
          UPDATE tasks
          SET priority = $3, updated_at = CURRENT_TIMESTAMP
          WHERE id = ANY($1::int[]) AND user_id = $2 AND deleted_at IS NULL
          RETURNING *`;
        break;
      default:
        return [];
    }

    const result = await db.query(query, params);
    return result.rows;
  }

  async getStats(userId) {
    const result = await db.query(
      `SELECT
        COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) as total,
        COUNT(CASE WHEN is_complete = true AND deleted_at IS NULL THEN 1 END) as complete,
        COUNT(CASE WHEN is_complete = false AND deleted_at IS NULL THEN 1 END) as pending,
        COUNT(CASE WHEN is_complete = false AND due_date IS NOT NULL AND due_date < CURRENT_TIMESTAMP AND deleted_at IS NULL THEN 1 END) as overdue,
        COUNT(CASE WHEN is_complete = false AND priority = 'urgent' AND deleted_at IS NULL THEN 1 END) as urgent_pending,
        COUNT(CASE WHEN is_complete = false AND priority = 'high' AND deleted_at IS NULL THEN 1 END) as high_pending,
        COUNT(CASE WHEN deleted_at IS NOT NULL THEN 1 END) as deleted
      FROM tasks
      WHERE user_id = $1`,
      [userId],
    );

    const stats = result.rows[0];
    return {
      total: parseInt(stats.total, 10) || 0,
      complete: parseInt(stats.complete, 10) || 0,
      pending: parseInt(stats.pending, 10) || 0,
      overdue: parseInt(stats.overdue, 10) || 0,
      urgent_pending: parseInt(stats.urgent_pending, 10) || 0,
      high_pending: parseInt(stats.high_pending, 10) || 0,
      deleted: parseInt(stats.deleted, 10) || 0,
    };
  }

  async health() {
    const start = Date.now();
    const result = await db.query("SELECT 1");
    const latency = Date.now() - start;
    return {
      connected: result.rowCount === 1,
      latencyMs: latency,
    };
  }
}

export default new TaskRepository();
