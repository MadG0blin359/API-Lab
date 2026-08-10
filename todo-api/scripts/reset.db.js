import db from "../src/config/database.js";

async function resetDatabase() {
  console.log("⚠️ Starting database reset...");

  try {
    // TRUNCATE deletes all rows instantly.
    // RESTART IDENTITY resets the SERIAL sequence back to 1.
    // This is inherently a single atomic transaction in PostgreSQL.
    await db.query("TRUNCATE TABLE tasks RESTART IDENTITY CASCADE;");

    console.log("✅ Database reset successful! The next task will have ID 1.");
  } catch (error) {
    console.error("❌ Failed to reset database:", error.message);
  } finally {
    // Crucial: Close the PostgreSQL connection pool to allow the terminal script to exit gracefully
    await db.end();
  }
}

// Execute the async function
resetDatabase();
