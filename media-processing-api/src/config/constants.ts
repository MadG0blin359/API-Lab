// ─── Storage ────────────────────────────────────────────────────
export const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET_NAME || "media-assets";
export const INCOMING_FOLDER = "incoming";
export const PROCESSED_FOLDER = "processed";

// ─── Upload Limits ──────────────────────────────────────────────
export const MAX_FILE_SIZE_BYTES = Number(process.env.MAX_FILE_SIZE_MB || 10) * 1024 * 1024;
export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

// ─── Image Processing Defaults & Variants ───────────────────────
export const IMAGE_VARIANTS = {
  thumbnail: { width: 200, height: 200, fit: "cover" as const, quality: 75 },
  medium: { width: 800, height: 800, fit: "inside" as const, quality: 80 },
  full: { width: 1920, height: 1080, fit: "inside" as const, quality: 85 },
} as const;


// ─── Inngest Worker Limits (Optimized for Free Tier: 512MB RAM) ──
export const INNGEST_CONCURRENCY_LIMIT = Number(process.env.INNGEST_CONCURRENCY_LIMIT || 1);
export const INNGEST_RATE_LIMIT = Number(process.env.INNGEST_RATE_LIMIT || 30); // 30 jobs per minute

// ─── Cleanup (Conserves Inngest Free Tier Steps) ──────────────────
export const CLEANUP_MAX_AGE_HOURS = 24;
export const CLEANUP_CRON_EXPRESSION = process.env.CLEANUP_CRON_EXPRESSION || "0 */12 * * *"; // Runs every 12 hours
