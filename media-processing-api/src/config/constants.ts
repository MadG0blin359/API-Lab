// ─── Storage ────────────────────────────────────────────────────
export const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET_NAME || "media-assets";
export const INCOMING_FOLDER = "incoming";
export const PROCESSED_FOLDER = "processed";

// ─── Upload Limits ──────────────────────────────────────────────
export const MAX_FILE_SIZE_BYTES = Number(process.env.MAX_FILE_SIZE_MB || 10) * 1024 * 1024;
export const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

// ─── Image Processing Defaults ──────────────────────────────────
export const MAX_IMAGE_WIDTH = 1920;
export const MAX_IMAGE_HEIGHT = 1080;
export const WEBP_QUALITY = 80;

// ─── Cleanup ────────────────────────────────────────────────────
export const CLEANUP_MAX_AGE_HOURS = 24;
export const CLEANUP_CRON_EXPRESSION = "0 * * * *"; // Every hour
