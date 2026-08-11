import db from "../src/config/database.js";

// Use 'npm run db:reset' to run this script

console.log("⚠️ Starting database reset...");

try {
  // 1. We use a database transaction.
  // This guarantees that if the first query works but the second fails,
  // the whole thing is reversed to prevent corruption.
  const resetTransaction = db.transaction(() => {
    // 2. Delete all rows from the tasks table
    db.prepare("DELETE FROM tasks").run();

    // 3. Reset the internal auto-increment counter back to 0
    db.prepare("UPDATE sqlite_sequence SET seq = 0 WHERE name = 'tasks'").run();
  });

  // 4. Execute the transaction
  resetTransaction();

  console.log("✅ Database reset successful! The next task will have ID 1.");
} catch (error) {
  console.error("❌ Failed to reset database:", error.message);
}
