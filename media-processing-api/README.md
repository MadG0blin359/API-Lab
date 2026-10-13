# Media Processing API

> Production-grade, asynchronous asset optimization pipeline built with **Express 5**, **TypeScript**, **Supabase Storage & PostgreSQL**, **Sharp**, and **Inngest**.

[![Render](https://img.shields.io/badge/Deployed%20on-Render-46E3B7?style=flat&logo=render&logoColor=white)](https://api-lab-media-processing-api.onrender.com/)
[![Swagger Docs](https://img.shields.io/badge/API%20Docs-Swagger%20UI-85EA2D?style=flat&logo=swagger&logoColor=black)](https://api-lab-media-processing-api.onrender.com/docs)
[![Health Status](https://img.shields.io/badge/Health%20Check-Live-green?style=flat)](https://api-lab-media-processing-api.onrender.com/health)

---

## 🌐 Live Production Deployment

The API is deployed on **Render**:
* **Live Base URL**: [`https://api-lab-media-processing-api.onrender.com`](https://api-lab-media-processing-api.onrender.com)
* **Interactive Swagger UI**: [`https://api-lab-media-processing-api.onrender.com/docs`](https://api-lab-media-processing-api.onrender.com/docs)
* **Health / Liveness Probe**: [`https://api-lab-media-processing-api.onrender.com/health`](https://api-lab-media-processing-api.onrender.com/health)
* **Readiness Probe**: [`https://api-lab-media-processing-api.onrender.com/ready`](https://api-lab-media-processing-api.onrender.com/ready)
* **Prometheus Metrics**: [`https://api-lab-media-processing-api.onrender.com/metrics`](https://api-lab-media-processing-api.onrender.com/metrics)

---

## 📖 Overview

The **Media Processing API** is an event-driven asset processing backend designed to handle CPU-heavy transformations off the main Node.js V8 thread:

1. **The Fast Door (O(1) Request Ingestion)**: Ingests image payloads via standard `multipart/form-data` or **Zero-Memory Direct Presigned Uploads**, validates magic bytes, caches in temporary storage, registers a `pending` job in PostgreSQL, dispatches an event to Inngest, and immediately returns `202 Accepted` with a tracking `jobId`.
2. **Durable Worker Pipelines**: Inngest step functions process the raw asset off-thread: stripping EXIF metadata, auto-orienting, generating responsive variants (`thumbnail`, `medium`, `full`), BlurHash strings, and LQIP data URLs.
3. **Strict Security with Dynamic Signed URLs**: Assets in private Supabase buckets are accessible only via dynamically generated 1-hour signed URLs with HMAC tokens.
4. **Real-Time Delivery (SSE)**: Clients can subscribe to `GET /api/media/:id/events` for instant status transitions without polling.
5. **Observability & Probes**: Exposes `/health`, `/ready` (deep dependency checks), and standard Prometheus `/metrics`.
6. **Automated Scheduled Garbage Collection**: An hourly Inngest cron job prunes media files and job records older than 24 hours.

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    Client["Client / Web Application"]

    subgraph API["Express 5 REST API (Render)"]
        Upload["POST /api/media/upload\n(10 req/min + Magic Bytes)"]
        Presign["POST /api/media/presign-upload\n(Zero-Memory Direct Ingestion)"]
        ProcessDirect["POST /api/media/process-direct"]
        Status["GET /api/media/:id\n(1h Signed URLs)"]
        SSE["GET /api/media/:id/events\n(Server-Sent Events)"]
        Health["GET /health & /ready"]
        Metrics["GET /metrics\n(Prometheus)"]
        InngestWebhook["POST /api/inngest\n(Inngest Comm Handler)"]
        Swagger["GET /docs\n(Swagger UI)"]
    end

    subgraph Supabase["Supabase Cloud"]
        DB[("PostgreSQL\n(media_jobs table)")]
        Storage["Storage Bucket\n(media-assets)"]
    end

    subgraph Inngest["Inngest Workers"]
        Worker["processMediaJob\n(Concurrency: 5 | RateLimit: 30/min)\n• EXIF Stripping & Auto-Orientation\n• BlurHash & LQIP Base64\n• Responsive Variants: thumb, med, full"]
        Cron["cleanupDatabaseJob\n(Hourly Cron: 0 * * * *)"]
    end

    Client -->|"Standard multipart upload"| Upload
    Client -->|"1. Request presigned upload URL"| Presign
    Presign -->|"Return uploadUrl"| Client
    Client -->|"2. Direct PUT to bucket (0 server RAM)"| Storage
    Client -->|"3. Trigger background processing"| ProcessDirect

    Upload -->|"Cache buffer to incoming/"| Storage
    Upload -->|"Insert job (pending)"| DB
    ProcessDirect -->|"Insert job (pending)"| DB

    Upload -->|"Dispatch media/process.requested"| InngestWebhook
    ProcessDirect -->|"Dispatch media/process.requested"| InngestWebhook

    InngestWebhook --> Worker
    Worker -->|"Download raw asset"| Storage
    Worker -->|"Sharp: Optimize & Generate Variants"| Worker
    Worker -->|"Upload processed/{id}-{variant}.webp"| Storage
    Worker -->|"Update status: completed + JSON variants"| DB
    Worker -.->|"Notify SSE listeners"| SSE

    Client -->|"Real-time stream"| SSE
    Client -->|"Poll status"| Status
    Status -->|"Query status & paths"| DB
    Status -->|"Generate 1h Signed URLs"| Storage
    Status -->|"Return signed variants & blurhash"| Client

    Cron -->|"Purge expired jobs & files > 24 hours"| DB
    Cron -->|"Remove expired files"| Storage
```

---

## 🚀 Key Features

* **Zero-Memory Direct Ingestion**: Clients can upload directly to Supabase Storage via `POST /api/media/presign-upload`, bypassing server RAM and network bandwidth entirely.
* **Magic Byte MIME Validation**: Inspects actual binary header signatures (`file-type`) to reject disguised malicious files.
* **Tiered Rate Limiting**:
  * Uploads restricted to **10 requests per minute per IP** (`express-rate-limit`).
  * General endpoints throttled to **100 requests per minute per IP**.
* **Inngest Concurrency & Rate Controls**:
  * Worker concurrency limited to **5 parallel tasks** to prevent memory spikes.
  * Rate limited to **30 background executions per minute**.
* **Core Media Capabilities**:
  * **Responsive Variants**: Generates `thumbnail` (200x200), `medium` (800x800), and `full` (1920x1080) WebP assets.
  * **EXIF Metadata Stripping & Auto-Orientation**: Strips sensitive GPS/camera data while preserving orientation.
  * **BlurHash & LQIP**: Generates a compact BlurHash string and a Base64 Low-Quality Image Placeholder data URL for instant frontend rendering.
* **Real-Time Server-Sent Events (SSE)**: Stream status updates at `GET /api/media/:id/events`.
* **Health & Readiness Probes**: `/health` (liveness) and `/ready` (deep check on PostgreSQL and Supabase Storage).
* **Prometheus Metrics**: Standard `/metrics` endpoint measuring HTTP requests, durations, processing times, and upload counters.

---

## 🛠️ Tech Stack & Dependencies

* **Runtime**: [Node.js](https://nodejs.org/) (>= 20.0.0)
* **Framework**: [Express 5](https://expressjs.com/)
* **Database & Storage**: [Supabase](https://supabase.com/) (`@supabase/supabase-js`, PostgreSQL, Object Storage)
* **Background Orchestration**: [Inngest](https://www.inngest.com/) (`inngest`)
* **Image Processing**: [Sharp](https://sharp.pixelplumbing.com/) & [BlurHash](https://github.com/woltapp/blurhash)
* **Binary MIME Validation**: [file-type](https://github.com/sindresorhus/file-type)
* **Rate Limiting**: [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit)
* **Metrics**: [prom-client](https://github.com/siimon/prom-client)
* **Documentation**: [Swagger UI Express](https://github.com/scottie1984/swagger-ui-express)
* **Hosting**: [Render](https://render.com/)

---

## 📁 Project Structure

```
media-processing-api/
├── openapi.json                  # OpenAPI 3.0 API specification
├── package.json
├── tsconfig.json
├── Dockerfile                    # Production multi-stage Alpine Dockerfile
├── docker-compose.yml            # Local container stack with Prometheus
├── prometheus.yml                # Prometheus scraping configuration
├── render.yaml                   # Render deployment blueprint
├── .env.example
├── README.md
├── src/
│   ├── app.ts                   # Express app factory, health, metrics, and middleware setup
│   ├── server.ts                # Server bootstrap & graceful shutdown listeners
│   ├── config/
│   │   ├── constants.ts         # Central configuration, variants, and Inngest limits
│   │   └── schema.sql           # Database schema & indexes for Supabase
│   ├── controllers/
│   │   └── media.controller.ts  # Upload, presigned upload, signed variants, and SSE
│   ├── inngest/
│   │   ├── client.ts            # Inngest SDK client
│   │   ├── index.ts             # Function registry export
│   │   └── functions/
│   │       ├── processMedia.ts  # Worker with concurrency, EXIF, BlurHash, and variants
│   │       └── cleanupDatabase.ts # Scheduled hourly garbage collection
│   ├── middlewares/
│   │   ├── error.handler.ts     # Centralized error handler
│   │   ├── rate-limit.middleware.ts # Rate limiting (10 uploads/min)
│   │   └── upload.middleware.ts # Multer & binary magic byte validation
│   ├── repositories/
│   │   └── media.repository.ts  # Supabase PostgreSQL CRUD abstraction
│   ├── routes/
│   │   └── media.routes.ts      # REST API route declarations
│   ├── services/
│   │   ├── media.service.ts     # Business logic & compensating rollback actions
│   │   └── storage.service.ts   # Supabase Storage & presigned URLs
│   ├── utils/
│   │   ├── app.error.ts         # Operational error class
│   │   ├── events.ts            # SSE event emitter manager
│   │   ├── metrics.ts           # Prometheus metrics definitions
│   │   ├── supabase.ts          # Supabase client singleton
│   │   └── swagger.ui.ts        # Swagger UI route binder
│   └── validators/
│       └── env.validator.ts     # Startup environment variable validation
```

---

## ⚙️ Prerequisites & Setup

### 1. Database & Storage Setup (Supabase)
Run the script in [`src/config/schema.sql`](src/config/schema.sql) in your Supabase SQL Editor and ensure a private storage bucket named **`media-assets`** exists.

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set the required credentials:
```env
NODE_ENV=development
PORT=3000

SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_SERVICE_KEY=<your-supabase-service-role-secret-key>

INNGEST_EVENT_KEY=<your-inngest-event-key>
INNGEST_SIGNING_KEY=<your-inngest-signing-key>
```

---

## 🏃 Running Locally

### Development Server
```bash
npm run start:dev
```
Server runs at `http://localhost:3000`.

### Inngest Local Dev Server
```bash
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```
Access dashboard at `http://localhost:8288`.

### Production Build & Run
```bash
npm run build
npm start
```

---

## 📡 API Reference

Base URLs:
* **Production**: `https://api-lab-media-processing-api.onrender.com`
* **Local**: `http://localhost:3000`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/media/upload` | Ingests image via Express buffer (10 req/min, magic bytes verified, returns 202) |
| `POST` | `/api/media/presign-upload` | Generates signed upload URL for zero-memory direct client uploads |
| `POST` | `/api/media/process-direct` | Notifies server to start background processing after direct upload |
| `GET` | `/api/media/:id` | Polls status & dynamically returns 1-hour signed URLs for variants |
| `GET` | `/api/media/:id/events` | Real-time Server-Sent Events (SSE) status stream |
| `GET` | `/health` | Liveness probe (uptime, status) |
| `GET` | `/ready` | Deep readiness probe checking Database & Storage bucket health |
| `GET` | `/metrics` | Prometheus metrics export |
| `GET` | `/docs` | Interactive Swagger UI documentation |
| `POST` | `/api/inngest` | Inngest webhook communication endpoint |

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
