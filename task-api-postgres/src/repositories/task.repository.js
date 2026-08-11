import db from "../config/database.js";

class TaskRepository {
  async seedDatabaseIfEmpty() {
    try {
      const result = await db.query("SELECT COUNT(*) as count FROM tasks");
      // PostgreSQL returns COUNT as a string (bigint), so it must be parsed
      const count = parseInt(result.rows[0].count, 10);

      if (count === 0) {
        console.log("🌱 Database is empty. Seeding initial data...");

        const initialTasks = [
          {
            title: "First Assignment",
            description: "Task details...",
            is_complete: true,
          },
          {
            title: "Second Assignment",
            description: "Task details...",
            is_complete: true,
          },
          {
            title: "Third Assignment",
            description: "Task details...",
            is_complete: false,
          },
        ];

        // Acquire a dedicated client from the pool for the transaction
        const client = await db.connect();
        try {
          // a transaction for bulk inserts for massive performance gains
          await client.query("BEGIN");
          const insertQuery =
            "INSERT INTO tasks (title, description, is_complete) VALUES($1, $2, $3)";

          for (const task of initialTasks) {
            await client.query(insertQuery, [
              task.title,
              task.description,
              task.is_complete,
            ]);
          }

          await client.query("COMMIT");
          console.log("✅ Database seeding complete!");
        } catch (error) {
          await client.query("ROLLBACK");
          console.error("❌ Transaction failed, rolled back.", error);
        } finally {
          client.release();
        }
      }
    } catch (error) {
      console.error(
        "❌ Seeding failed. Ensure the tasks table exists.",
        error.message,
      );
    }
  }

  async findAll() {
    const result = await db.query(
      "SELECT * FROM tasks ORDER BY updated_at DESC",
    );
    return result.rows;
  }

  async findById(id) {
    const result = await db.query("SELECT * FROM tasks WHERE id = $1", [id]);
    return result.rows[0];
  }

  async findByStatus(is_complete) {
    const result = await db.query(
      "SELECT * FROM tasks WHERE is_complete = $1 ORDER BY updated_at DESC",
      [is_complete],
    );
    return result.rows;
  }

  async search(searchString) {
    const safePattern = `%${searchString}%`;
    const result = await db.query(
      "SELECT * FROM tasks WHERE title ILIKE $1 OR description ILIKE $2 ORDER BY updated_at DESC",
      [safePattern, safePattern],
    );
    return result.rows;
  }

  async getStats() {
    const result = await db.query(`SELECT COUNT(*) as total, 
      COUNT(CASE WHEN is_complete = true THEN 1 END) as complete,
      COUNT(CASE WHEN is_complete = false THEN 1 END) as pending
      FROM tasks
      `);

    const stats = result.rows[0];
    return {
      total: parseInt(stats.total, 10) || 0,
      complete: parseInt(stats.complete, 10) || 0,
      pending: parseInt(stats.pending, 10) || 0,
    };
  }

  async create(taskData) {
    const { title, description = null } = taskData;

    const result = await db.query(
      "INSERT INTO tasks (title, description, is_complete) VALUES ($1, $2, $3) RETURNING *",
      [title, description, false],
    );

    return result.rows[0];
  }

  async update(id, taskData) {
    const { title, description, is_complete } = taskData;

    const result = await db.query(
      `
      UPDATE tasks
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          is_complete = COALESCE($3, is_complete),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
      `,
      [
        title !== undefined ? title : null,
        description !== undefined ? description : null,
        is_complete !== undefined ? is_complete : null,
        id,
      ],
    );

    if (result.rowCount === 0) return null;
    return result.rows[0];
  }

  async delete(id) {
    const result = await db.query("DELETE FROM tasks WHERE id = $1", [id]);
    return result.rowCount > 0;
  }

  async paginate(limit, offset) {
    const result = await db.query(
      "SELECT * FROM tasks ORDER BY updated_at DESC LIMIT $1 OFFSET $2",
      [limit, offset],
    );

    return result.rows;
  }

  async health() {
    const result = await db.query("SELECT 1");
    return result.rowCount === 1;
  }
}

export default new TaskRepository();
