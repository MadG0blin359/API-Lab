import { EventEmitter } from "events";

export interface JobEventPayload {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  data?: any;
  error?: string;
  timestamp: string;
}

class JobEventManager extends EventEmitter {
  constructor() {
    super();
    // Allow large numbers of concurrent SSE listeners
    this.setMaxListeners(200);
  }

  notify(jobId: string, payload: JobEventPayload) {
    this.emit(`job:${jobId}`, payload);
  }
}

export const jobEvents = new JobEventManager();
