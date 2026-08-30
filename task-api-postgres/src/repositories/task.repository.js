import db from "../config/database.js";

class TaskRepository {
  async findAll(userId) {
    const result = await db.query(
      "SELECT * FROM tasks WHERE user_id = $1 ORDER BY updated_at DESC",
      [userId],
    );
    return result.rows;
  }

  async findById(userId, id) {
    const result = await db.query(
      "SELECT * FROM tasks WHERE id = $1 AND user_id = $2",
      [id, userId],
    );
    return result.rows[0];
  }

  async findByStatus(userId, is_complete) {
    const result = await db.query(
      "SELECT * FROM tasks WHERE user_id = $1 AND is_complete = $2 ORDER BY updated_at DESC",
      [userId, is_complete],
    );
    return result.rows;
  }

  async search(userId, searchString) {
    const safePattern = `%${searchString}%`;
    const result = await db.query(
      "SELECT * FROM tasks WHERE user_id = $1 AND (title ILIKE $2 OR description ILIKE $3) ORDER BY updated_at DESC",
      [userId, safePattern, safePattern],
    );
    return result.rows;
  }

  async getStats(userId) {
    const result = await db.query(
      `SELECT COUNT(*) as total, 
      COUNT(CASE WHEN is_complete = true THEN 1 END) as complete,
      COUNT(CASE WHEN is_complete = false THEN 1 END) as pending
      FROM tasks
      WHERE user_id = $1`,
      [userId],
    );

    const stats = result.rows[0];
    return {
      total: parseInt(stats.total, 10) || 0,
      complete: parseInt(stats.complete, 10) || 0,
      pending: parseInt(stats.pending, 10) || 0,
    };
  }

  async create(userId, taskData) {
    const { title, description = null } = taskData;

    const result = await db.query(
      "INSERT INTO tasks (user_id, title, description, is_complete) VALUES ($1, $2, $3, $4) RETURNING *",
      [userId, title, description, false],
    );

    return result.rows[0];
  }

  async update(userId, id, taskData) {
    const { title, description, is_complete } = taskData;

    const result = await db.query(
      `
      UPDATE tasks
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          is_complete = COALESCE($3, is_complete),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND user_id = $5
      RETURNING *
      `,
      [
        title !== undefined ? title : null,
        description !== undefined ? description : null,
        is_complete !== undefined ? is_complete : null,
        id,
        userId,
      ],
    );

    if (result.rowCount === 0) return null;
    return result.rows[0];
  }

  async delete(userId, id) {
    const result = await db.query(
      "DELETE FROM tasks WHERE id = $1 AND user_id = $2",
      [id, userId],
    );
    return result.rowCount > 0;
  }

  async paginate(userId, limit, offset) {
    const result = await db.query(
      "SELECT * FROM tasks WHERE user_id = $1 ORDER BY updated_at DESC LIMIT $2 OFFSET $3",
      [userId, limit, offset],
    );

    return result.rows;
  }

  async health() {
    const result = await db.query("SELECT 1");
    return result.rowCount === 1;
  }
}

export default new TaskRepository();
