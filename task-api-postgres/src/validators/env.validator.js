const validateEnv = () => {
  const requiredVariables = [
    "NODE_ENV",
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "POSTGRES_DB",
    "DB_HOST",
    "DB_PORT",
    "DB_POOL_MAX",
    "PGB_MAX_CLIENT_CONN",
    "PGB_DEFAULT_POOL_SIZE",
  ];

  const missing = requiredVariables.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }
};

export default validateEnv;
