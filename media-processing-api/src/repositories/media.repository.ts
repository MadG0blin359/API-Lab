import { supabase } from "../utils/supabase.js";

export const mediaRepository = {
  async createJob(originalFilename: string) {
    const { data, error } = await supabase
      .from("media_jobs")
      .insert({ original_filename: originalFilename, status: "pending" })
      .select("id")
      .single();

    if (error || !data) throw error;
    return data;
  },

  async getJobById(id: string) {
    const { data, error } = await supabase
      .from("media_jobs")
      .select("status, result_url, error_message")
      .eq("id", id)
      .single();

    return { data, error };
  },

  async updateJobStatus(id: string, updates: {
    status: string;
    result_url?: string;
    error_message?: string;
    updated_at?: string;
  }) {
    const { error } = await supabase
      .from("media_jobs")
      .update(updates)
      .eq("id", id);

    if (error) throw error;
  },
};
