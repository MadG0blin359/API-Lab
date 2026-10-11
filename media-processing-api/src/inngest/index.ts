import { processMediaJob } from "./functions/processMedia.js";
import { cleanupDatabaseJob } from "./functions/cleanupDatabase.js";

// Export the bundled array of functions
export const functions = [
  processMediaJob,
  cleanupDatabaseJob
];