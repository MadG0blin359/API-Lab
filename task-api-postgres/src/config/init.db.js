import db from "./database.js";

/**
 * Ensures required tables, columns, and indexes exist.
 * Runs idempotently on server startup to handle schema upgrades safely.
 */
export async function initializeDatabase() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        is_complete BOOLEAN NOT NULL DEFAULT false,
        priority VARCHAR(20) NOT NULL DEFAULT 'medium',
        due_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
        tags TEXT[] NOT NULL DEFAULT '{}',
        deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'medium';
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE DEFAULT NULL;
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tags TEXT[] NOT NULL DEFAULT '{}';
      ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

      CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
      CREATE INDEX IF NOT EXISTS idx_tasks_user_deleted ON tasks(user_id, deleted_at);
      CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(user_id, priority);
      CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(user_id, due_date);
      CREATE INDEX IF NOT EXISTS idx_tasks_tags ON tasks USING GIN (tags);
    `);
    console.log("✅ Database schema initialized and up-to-date.");
  } catch (error) {
    console.warn("⚠️ Database initialization warning (may be running without direct DDL access):", error.message);
  }
}
