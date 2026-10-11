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
   * Returns the public URL.
   */
  async uploadProcessed(buffer: Buffer, filename: string) {
    const storagePath = `processed/${filename}`;

    const { error } = await supabase.storage
      .from(SUPABASE_BUCKET)
      .upload(storagePath, buffer, { contentType: "image/webp" });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from(SUPABASE_BUCKET)
      .getPublicUrl(storagePath);

    return urlData.publicUrl;
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
