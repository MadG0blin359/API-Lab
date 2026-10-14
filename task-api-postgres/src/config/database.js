import pkg from "pg";
const { Pool } = pkg;

const isProduction = process.env.NODE_ENV === "production";
const useSsl =
  isProduction ||
  process.env.DB_SSL === "true" ||
  (process.env.DB_HOST &&
    !process.env.DB_HOST.includes("localhost") &&
    !process.env.DB_HOST.includes("127.0.0.1") &&
    process.env.DB_HOST !== "pgbouncer");

const poolConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.DB_POOL_MAX, 10) || 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 30000,
    }
  : {
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.DB_POOL_MAX, 10) || 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 30000,
    };

const db = new Pool(poolConfig);

db.query("SELECT 1")
  .then(() =>
    console.log("✅ Successfully connected to PostgreSQL database."),
  )
  .catch((err) => console.error("❌ Database connection error:", err.message));

export default db;
