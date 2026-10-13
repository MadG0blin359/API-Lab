import client from "prom-client";

// Collect default system metrics (CPU, RAM, event loop, etc.)
client.collectDefaultMetrics({ prefix: "media_api_" });

// Custom Prometheus Metrics
export const httpRequestDurationMicroseconds = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10],
});

export const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
});

export const mediaUploadsTotal = new client.Counter({
  name: "media_uploads_total",
  help: "Total media uploads accepted",
  labelNames: ["status"],
});

export const mediaProcessedTotal = new client.Counter({
  name: "media_processed_total",
  help: "Total media processing background runs completed or failed",
  labelNames: ["status"],
});

export const mediaProcessingDurationSeconds = new client.Histogram({
  name: "media_processing_duration_seconds",
  help: "Time spent optimizing media files through Sharp pipeline",
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
});

export const register = client.register;
