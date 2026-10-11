import { inngestClient } from "../client.js";
import { supabase } from "../../utils/supabase.js";
import { storageService } from "../../services/storage.service.js";
import {
  SUPABASE_BUCKET,
  PROCESSED_FOLDER,
  INCOMING_FOLDER,
  CLEANUP_MAX_AGE_HOURS,
  CLEANUP_CRON_EXPRESSION,
} from "../../config/constants.js";

interface ExpiredJob {
  id: string;
  result_url: string | null;
  status: string;
}

export const cleanupDatabaseJob = inngestClient.createFunction(
  {
    id: "cleanup-expired-media",
    trigger: { cron: CLEANUP_CRON_EXPRESSION },
  },
  async ({ step }: { step: any }) => {
    // Step 1: Query media_jobs table for expired records
    const expiredJobs: ExpiredJob[] = await step.run("find-expired-jobs", async () => {
      const cutoffDate = new Date(Date.now() - CLEANUP_MAX_AGE_HOURS * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from("media_jobs")
        .select("id, result_url, status")
        .lte("created_at", cutoffDate.toISOString());

      if (error) {
        throw new Error(`Failed to query expired jobs: ${error.message}`);
      }

      return (data ?? []) as ExpiredJob[];
    });

    if (expiredJobs.length === 0) {
      return { deletedJobs: 0, timestamp: new Date().toISOString() };
    }

    // Step 2: Delete storage files from Supabase Storage bucket
    await step.run("delete-storage-files", async () => {
      const pathsToDelete: string[] = [];

      for (const job of expiredJobs) {
        // Add processed file path
        pathsToDelete.push(`${PROCESSED_FOLDER}/${job.id}.webp`);
      }

      // Best-effort list and clean incoming folder for matching files
      try {
        const { data: incomingFiles } = await supabase.storage
          .from(SUPABASE_BUCKET)
          .list(INCOMING_FOLDER);

        if (incomingFiles && incomingFiles.length > 0) {
          for (const file of incomingFiles) {
            if (expiredJobs.some((job: ExpiredJob) => file.name.includes(job.id))) {
              pathsToDelete.push(`${INCOMING_FOLDER}/${file.name}`);
            }
          }
        }
      } catch (err) {
        console.warn("Storage warning: Failed to list incoming files:", err);
      }

      const uniquePaths = Array.from(new Set(pathsToDelete));
      await storageService.deleteFiles(uniquePaths);

      console.log(`Cleaned up ${uniquePaths.length} storage files.`);
      return { deletedFiles: uniquePaths.length };
    });

    // Step 3: Delete expired rows from media_jobs table
    await step.run("delete-database-records", async () => {
      const expiredJobIds = expiredJobs.map((job: ExpiredJob) => job.id);

      const { error } = await supabase
        .from("media_jobs")
        .delete()
        .in("id", expiredJobIds);

      if (error) {
        throw new Error(`Failed to delete expired jobs from database: ${error.message}`);
      }

      console.log(`Deleted ${expiredJobIds.length} expired jobs from database.`);
      return { deletedJobs: expiredJobIds.length };
    });

    return {
      deletedJobs: expiredJobs.length,
      timestamp: new Date().toISOString(),
    };
  },
);
