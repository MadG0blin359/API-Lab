import db from "../config/database.js";

const tasks = [
  {
    id: 1,
    title: "First Assignment",
    isComplete: true,
  },
  {
    id: 2,
    title: "Second Assignment",
    isComplete: true,
  },
  {
    id: 3,
    title: "Third Assignment",
    isComplete: false,
  },
];

class TaskRepository {
  // Static private one-time compiled statements
  static #findAllStmt = db.prepare(
    "SELECT * FROM tasks ORDER BY updatedAt DESC",
  );
  static #findByIdStmt = db.prepare("SELECT * FROM tasks WHERE id = ?");
  static #createStmt = db.prepare(
    "INSERT INTO tasks (title, description, isComplete) VALUES(?, ?, 0)",
  );
  static #updateStmt = db.prepare(`UPDATE tasks
    SET title = COALESCE(?, title),
        description = COALESCE(?, description),
        isComplete = COALESCE(?, isComplete)
    WHERE id = ?
    `);
  static #deleteStmt = db.prepare("DELETE FROM tasks WHERE id = ?");

  // Clean-up
  static #deleteAllStmt = db.prepare("DELETE FROM tasks");
  static #resetCounterStmt = db.prepare(
    "UPDATE sqlite_sequence SET seq = 0 WHERE name = 'tasks'",
  );

  findAll() {
    const dataArr = TaskRepository.#findAllStmt.all();
    // Format the SQLite boolean (1/0) back to true/false for the client
    return dataArr.map((task) => ({
      ...task,
      isComplete: !!task.isComplete,
    }));
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

  create(taskData) {
    const { title, description = null } = taskData;

    const infoObj = TaskRepository.#createStmt.run(title, description);
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
