import Databse from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Databse(path.join(__dirname, "../../tasks.db"), {
  verbose: console.log, // log all executed SQL queries for debugging
});
db.pragma("journal_mode = WAL");

const schemaPath = path.join(__dirname, "schema.sql");
const schemaSql = fs.readFileSync(schemaPath, "utf8");

db.exec(schemaSql);

export default db;
