import pkg from "pg";
const { Pool } = pkg;

const db = new Pool({
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  max: parseInt(process.env.DB_POOL_MAX, 10) || 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
});

db.connect()
  .then(() =>
    console.log("✅ Successfully connected to PostgreSQL Docker container."),
  )
  .catch((err) => console.error("❌ Database connection error", err.stack));

export default db;
