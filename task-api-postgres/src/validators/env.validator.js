const validateEnv = () => {
  const missing = [];

  // Validate Postgres configuration: either DATABASE_URL or individual params
  if (!process.env.DATABASE_URL) {
    const dbRequired = [
      "POSTGRES_USER",
      "POSTGRES_PASSWORD",
      "POSTGRES_DB",
      "DB_HOST",
      "DB_PORT",
    ];
    missing.push(...dbRequired.filter((key) => !process.env[key]));
  }

  const baseRequired = [
    "NODE_ENV",
    "CSRF_SECRET",
    "SUPABASE_URL",
    "SUPABASE_PUB_KEY",
  ];

  missing.push(...baseRequired.filter((key) => !process.env[key]));

  // Validate Redis configuration depending on environment
  if (process.env.NODE_ENV === "production" && !process.env.REDIS_URL) {
    missing.push("REDIS_URL (required in production)");
  } else if (
    process.env.NODE_ENV !== "production" &&
    !process.env.REDIS_URL &&
    (!process.env.REDIS_HOST || !process.env.REDIS_PORT)
  ) {
    missing.push("REDIS_HOST and REDIS_PORT (or REDIS_URL)");
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }
};

export default validateEnv;
