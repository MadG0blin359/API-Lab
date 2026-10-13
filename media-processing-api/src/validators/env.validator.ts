const validateEnv = () => {
  const isLocalDev = process.env.NODE_ENV === "development" && process.env.INNGEST_DEV === "1";

  const requiredVariables = [
    "NODE_ENV",
    "PORT",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_KEY",
    ...(!isLocalDev ? ["INNGEST_EVENT_KEY", "INNGEST_SIGNING_KEY"] : []),
  ];

  const missing = requiredVariables.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`,
    );
  }
};

export default validateEnv;
