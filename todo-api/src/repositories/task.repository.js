import db from "../config/database.js";

class TaskRepository {
  // Static private one-time compiled statements
  static #findAllStmt = db.prepare(
    "SELECT * FROM tasks ORDER BY updatedAt DESC",
  );
  static #findByIdStmt = db.prepare("SELECT * FROM tasks WHERE id = ?");
  static #createStmt = db.prepare(
    "INSERT INTO tasks (title, description, isComplete) VALUES(?, ?, ?)",
  );
  static #updateStmt = db.prepare(`UPDATE tasks
    SET title = COALESCE(?, title),
        description = COALESCE(?, description),
        isComplete = COALESCE(?, isComplete),
        updatedAt = CURRENT_TIMESTAMP
    WHERE id = ?
    `);
  static #deleteStmt = db.prepare("DELETE FROM tasks WHERE id = ?");
  static #countStmt = db.prepare("SELECT COUNT(*) as count FROM tasks");
  static #findByStatusStmt = db.prepare(
    "SELECT * FROM tasks WHERE isComplete = ? ORDER BY updatedAt DESC",
  );
  static #searchStmt = db.prepare(
    "SELECT * FROM tasks WHERE title LIKE ? OR description LIKE ? ORDER BY updatedAt DESC",
  );
  static #statsStmt = db.prepare(
    "SELECT COUNT(*) as total, COUNT(CASE WHEN isComplete = 1 THEN 1 END) as complete, COUNT(CASE WHEN isComplete = 0 THEN 1 END) as pending FROM tasks",
  );

  constructor() {
    this.#seedDatabaseIfEmpty();
  }

  #seedDatabaseIfEmpty() {
    // result: { count: 0 }
    const result = TaskRepository.#countStmt.get();

    if (result.count === 0) {
      console.log("🌱 Database is empty. Seeding initial data...");

      const initialTasks = [
        {
          title: "First Assignment",
          description: "Task details...",
          isComplete: true,
        },
        {
          title: "Second Assignment",
          description: "Task details...",
          isComplete: true,
        },
        {
          title: "Third Assignment",
          description: "Task details...",
          isComplete: false,
        },
      ];

      // a transaction for bulk inserts for massive performance gains
      const seedTransaction = db.transaction((tasks) => {
        for (const task of tasks) {
          TaskRepository.#createStmt.run(
            task.title,
            task.description,
            task.isComplete ? 1 : 0, // Convert boolean to SQLite 1/0
          );
        }
      });

      // 5. Execute the transaction
      seedTransaction(initialTasks);
      console.log("✅ Database seeding complete!");
    }
  }

  #mapDataArray(dataArr) {
    // Format the SQLite boolean (1/0) back to true/false for the client
    return dataArr.map((task) => ({
      ...task,
      isComplete: !!task.isComplete,
    }));
  }

  findAll() {
    const dataArr = TaskRepository.#findAllStmt.all();
    return this.#mapDataArray(dataArr);
  }

  findById(id) {
    let dataObj = TaskRepository.#findByIdStmt.get(id);

    if (!dataObj) return undefined;

    dataObj = {
      ...dataObj,
      isComplete: !!dataObj.isComplete,
    };

    return dataObj;
  }

  findByStatus(isComplete) {
    const isCompleteInt = isComplete ? 1 : 0;
    const dataArr = TaskRepository.#findByStatusStmt.all(isCompleteInt);

    return this.#mapDataArray(dataArr);
  }

  search(searchString) {
    const safePattern = `%${searchString}%`;

    const dataArr = TaskRepository.#searchStmt.all(safePattern, safePattern);

    return this.#mapDataArray(dataArr);
  }

  getStats() {
    const stats = TaskRepository.#statsStmt.get();
    return {
      total: stats.total || 0,
      complete: stats.complete || 0,
      pending: stats.pending || 0,
    };
  }

  create(taskData) {
    const { title, description = null } = taskData;

    const infoObj = TaskRepository.#createStmt.run(title, description, 0);
    return this.findById(infoObj.lastInsertRowid);
  }

  update(id, taskData) {
    const { title, description, isComplete } = taskData;
    const infoObj = TaskRepository.#updateStmt.run(
      title !== undefined ? title : null,
      description !== undefined ? description : null,
      isComplete !== undefined ? (isComplete ? 1 : 0) : null,
      id,
    );

    if (infoObj.changes === 0) return null;

    return this.findById(id);
  }

  delete(id) {
    const infoObj = TaskRepository.#deleteStmt.run(id);
    return infoObj.changes > 0;
  }
}

export default new TaskRepository();
