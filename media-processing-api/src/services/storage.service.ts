import { supabase } from "../utils/supabase.js";
import { SUPABASE_BUCKET, INCOMING_FOLDER } from "../config/constants.js";
import crypto from "crypto";
import path from "path";

export const storageService = {
  /**
   * Uploads a raw file buffer to the incoming folder in Supabase Storage.
   * Uses a UUID-based filename to prevent path traversal attacks.
   */
  async uploadIncoming(buffer: Buffer, originalname: string, mimetype: string) {
    const safeFilename = `${crypto.randomUUID()}${path.extname(originalname)}`;
    const storagePath = `${INCOMING_FOLDER}/${safeFilename}`;

    const { error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(storagePath, buffer, { contentType: mimetype });

    if (error) throw error;
    return storagePath;
  },

  /**
   * Generates a signed direct upload URL for client-side uploads.
   * Eliminates server RAM/bandwidth usage for image uploads.
   */
  async createPresignedUpload(originalname: string) {
    const safeFilename = `${crypto.randomUUID()}${path.extname(originalname)}`;
    const storagePath = `${INCOMING_FOLDER}/${safeFilename}`;

    const { data, error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .createSignedUploadUrl(storagePath);

    if (error || !data) {
      throw error || new Error("Failed to create signed upload URL");
    }

    return {
      uploadUrl: data.signedUrl,
      storagePath,
      token: data.token,
    };
  },

  /**
   * Downloads a file from Supabase Storage and returns its buffer.
   */
  async download(storagePath: string) {
    const { data, error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .download(storagePath);

    if (error || !data) throw error;
    return Buffer.from(await data.arrayBuffer());
  },

  /**
   * Uploads a processed buffer to the processed folder.
   * Returns the internal storage path.
   */
  async uploadProcessed(buffer: Buffer, filename: string) {
    const storagePath = `processed/${filename}`;

    const { error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(storagePath, buffer, { contentType: "image/webp" });

    if (error) throw error;

    return storagePath;
  },

  /**
   * Deletes files from storage. Does not throw on missing files.
   */
  async deleteFiles(paths: string[]) {
    if (paths.length === 0) return;
    const { error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .remove(paths);

    if (error) {
      console.warn(`⚠️ Storage cleanup warning: ${error.message}`);
    }
  },
};
