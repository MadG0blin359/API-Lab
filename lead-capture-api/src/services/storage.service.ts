import { supabaseAdmin, supabase } from "../config/supabase.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";
import crypto from "crypto";
import path from "path";

export const storageService = {
  /**
   * Uploads a file buffer to a Supabase Storage bucket.
   */
  async uploadFile(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    bucket = env.SUPABASE_BUCKET_NAME,
    folder = "general"
  ) {
    const ext = path.extname(originalName);
    const uniqueName = `${crypto.randomUUID()}${ext}`;
    const filePath = `${folder}/${uniqueName}`;

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, fileBuffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (error) {
      throw new AppError(500, `Storage upload failed: ${error.message}`);
    }

    // Get public URL (if bucket is public)
    const { data: publicUrlData } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return {
      path: data.path,
      fullPath: data.fullPath,
      publicUrl: publicUrlData.publicUrl,
    };
  },

  /**
   * Generates a temporary signed download URL for private bucket objects.
   */
  async createSignedUrl(
    filePath: string,
    expiresInSeconds = 3600,
    bucket = env.SUPABASE_BUCKET_NAME
  ) {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresInSeconds);

    if (error || !data) {
      throw new AppError(500, `Failed to create signed URL: ${error?.message || "Unknown error"}`);
    }

    return data.signedUrl;
  },

  /**
   * List files in a specific bucket folder.
   */
  async listFiles(folder = "", bucket = env.SUPABASE_BUCKET_NAME) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folder, {
        limit: 100,
        offset: 0,
        sortBy: { column: "created_at", order: "desc" },
      });

    if (error) {
      throw new AppError(500, `Failed to list files: ${error.message}`);
    }

    return data;
  },

  /**
   * Deletes files by their storage paths.
   */
  async deleteFiles(filePaths: string[], bucket = env.SUPABASE_BUCKET_NAME) {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .remove(filePaths);

    if (error) {
      throw new AppError(500, `Failed to delete files: ${error.message}`);
    }

    return data;
  },
};

export default storageService;
