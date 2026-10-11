Media Processing Pipeline: Design an asset optimization backend for web application where users upload single or batches of high-resolution images for automatic compression and formatting.

The Fast Door: The Express API receives the upload payload and immediately returns a tracking ID.

Background Work: CPU-heavy tasks block the Node.js main thread, making them the perfect candidate for background jobs. The worker processes the images (resizing, WebP conversion, watermarking) one by one without freezing the server.

Status Polling: The frontend actively queries the status endpoint, waiting for the eventual consistency state to flip to "done" so it can render the final download links.

The Cron Job: A scheduled garbage collection task runs every hour to delete processed media files older than 24 hours to free up container disk space.

Phase,Architectural Objective,Technical Execution,System & Complexity Focus
1. The Ingestion Layer,Configure endpoint for file uploads.,Implement POST /api/media/upload. Integrate multer for memory or disk buffering. Dispatch the media.requested event to Inngest.,O(1) event dispatching; minimizing main thread blocking and network payload overhead.
2. Storage & State,Establish the database schema and storage buckets.,"Define a Supabase table with states (pending, processing, completed, failed). Provision a storage bucket for processed assets.",Database transaction integrity; schema normalization and indexing for fast status lookups.
3. The Worker Logic,Construct the durable Inngest function.,"Create src/inngest/functions/processMedia.ts. Implement step functions to download the raw asset, compress/resize it, and upload the artifact to Supabase.",Peak memory allocation limits; ensuring step idempotency for safe retries upon container failure.

Required tools:
inngest: The official SDK for defining step functions and communicating with the Inngest orchestration cloud.

multer: The middleware for parsing multipart/form-data and handling incoming binary file streams directly in memory.

sharp: The high-performance C++ image processing library utilized for resizing, compressing, and converting media formats off the main V8 thread.

cors & compression: Standard Express middlewares for cross-origin resource sharing and HTTP payload compression.

swagger-ui-express: For rendering OpenAPI JSON specifications into a user interface on the /docs route.

Git Repository: Repository is alraedy created and initialized. Commit after each update.

Supabase Account: The media_jobs state table and the S3-compatible Object Storage (the media-assets bucket). Bucket is already created on supabase.