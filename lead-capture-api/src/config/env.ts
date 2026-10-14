import { z } from "zod";

/**
 * Native environment variable & file loading in Node.js 24+.
 *
 * Precedence order:
 * System / Shell / Cloud Environment Variables > .env.local > .env.<NODE_ENV> > .env
 */
const envCandidates = [
  `.env.${process.env.NODE_ENV || "development"}.local`,
  `.env.${process.env.NODE_ENV || "development"}`,
  ".env.local",
  ".env",
];

for (const envPath of envCandidates) {
  try {
    process.loadEnvFile(envPath);
  } catch {
    // Silently continue if the file does not exist
  }
}

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z
    .string()
    .default("3000")
    .transform((val) => parseInt(val, 10)),
  API_BASE_URL: z.string().default("http://localhost:3000"),
  SUPABASE_URL: z
    .string()
    .url({ message: "SUPABASE_URL must be a valid URL" })
    .default("https://your-project.supabase.co"),
  SUPABASE_ANON_KEY: z.string().default("your-anon-key"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default("your-service-role-key"),
  SUPABASE_SERVICE_KEY: z.string().optional(),
  SUPABASE_BUCKET_NAME: z.string().default("uploads"),
  CORS_ORIGIN: z.string().default("*"),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z
    .string()
    .default("900000") // 15 minutes
    .transform((val) => parseInt(val, 10)),
  RATE_LIMIT_MAX: z
    .string()
    .default("100")
    .transform((val) => parseInt(val, 10)),
  SUBMISSION_RATE_LIMIT_WINDOW_MS: z
    .string()
    .default("60000") // 1 minute
    .transform((val) => parseInt(val, 10)),
  SUBMISSION_RATE_LIMIT_MAX: z
    .string()
    .default("10") // Max 10 submissions per minute per IP
    .transform((val) => parseInt(val, 10)),

  // Security
  COOKIE_SECRET: z
    .string()
    .min(16, { message: "COOKIE_SECRET must be at least 16 characters" })
    .default("super-secret-cookie-encryption-key-min-16"),
  CSRF_SECRET: z
    .string()
    .min(16, { message: "CSRF_SECRET must be at least 16 characters" })
    .default("super-secret-csrf-token-secret-key-min-16"),
  CSRF_ENABLED: z
    .string()
    .default("true")
    .transform((val) => val === "true"),

  // Geolocation Provider Keys & Mock Toggles (for Acceptance Testing)
  IPSTACK_API_KEY: z.string().optional().default(""),
  IPAPI_CO_KEY: z.string().optional().default(""),
  MOCK_GEO_PROVIDER_A_FAIL: z
    .string()
    .default("false")
    .transform((val) => val === "true"),
  MOCK_GEO_PROVIDER_B_FAIL: z
    .string()
    .default("false")
    .transform((val) => val === "true"),

  // Side Effect Toggles (for Acceptance Testing)
  MOCK_NOTIFICATION_FAIL: z
    .string()
    .default("false")
    .transform((val) => val === "true"),
  NOTIFICATION_WEBHOOK_URL: z.string().optional().default(""),
});

const sanitizeEnv = () => {
  // Normalize empty strings to undefined so Zod defaults apply
  const rawEnv: Record<string, any> = {};
  for (const [key, val] of Object.entries(process.env)) {
    rawEnv[key] = val === "" ? undefined : val;
  }

  const parsed = envSchema.safeParse(rawEnv);

  if (!parsed.success) {
    console.error("❌ Invalid environment variables:");
    console.error(parsed.error.format());
    throw new Error("Invalid environment configuration.");
  }

  const data = parsed.data;
  const serviceKey =
    data.SUPABASE_SERVICE_ROLE_KEY !== "your-service-role-key"
      ? data.SUPABASE_SERVICE_ROLE_KEY
      : data.SUPABASE_SERVICE_KEY || data.SUPABASE_SERVICE_ROLE_KEY;

  return {
    ...data,
    SUPABASE_SERVICE_ROLE_KEY: serviceKey,
    SUPABASE_ANON_KEY:
      data.SUPABASE_ANON_KEY !== "your-anon-key"
        ? data.SUPABASE_ANON_KEY
        : serviceKey,
  };
};

export const env = sanitizeEnv();
export type Env = typeof env;
