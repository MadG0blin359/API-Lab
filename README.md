# API-Lab 🧪

> A curated collection of production-grade, architectural backend APIs demonstrating modern design patterns across Node.js, Express, TypeScript, event-driven pipelines, relational & document databases, and cloud storage.

---

## 📂 Projects Overview

| Project                                              | Tech Stack                                      | Architecture & Key Features                                                                                                                                                                                                                     | Deployment / Docs                                                                                                                                                                                                      |
| :--------------------------------------------------- | :---------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[`media-processing-api`](./media-processing-api)** | Express 5, TypeScript, Supabase, Inngest, Sharp | **Event-driven image processing**: O(1) ingestion, zero-memory direct uploads, magic bytes validation, responsive WebP variants, BlurHash & LQIP, dynamic 1h signed URLs, SSE real-time streaming, Prometheus metrics, and hourly cron cleanup. | [![Render](https://img.shields.io/badge/Render-Live-46E3B7?logo=render&logoColor=white)](https://api-lab-media-processing-api.onrender.com/)<br>[Swagger Docs](https://api-lab-media-processing-api.onrender.com/docs) |
| **[`blog-api`](./blog-api)**                         | Express, TypeScript, MongoDB / Mongoose         | **Content Management API**: Full relational model with Users, Posts, and Comments, authentication, pagination, and relational cascading.                                                                                                        | [README](./blog-api/README.md)                                                                                                                                                                                         |
| **[`student-api`](./student-api)**                   | Express, Node.js, REST                          | **Student Management System**: Core CRUD endpoints, schema validation, and structured error boundaries.                                                                                                                                         | [README](./student-api/README.md)                                                                                                                                                                                      |
| **[`task-api-postgres`](./task-api-postgres)**       | Express, TypeScript, PostgreSQL                 | **Relational Task Manager**: Structured SQL schema migrations, connection pooling, and transactional task workflows.                                                                                                                            | [README](./task-api-postgres/README.md)                                                                                                                                                                                |
| **[`task-api-sqlite`](./task-api-sqlite)**           | Express, SQLite, TypeScript                     | **Embedded Task Manager**: Lightweight, zero-configuration local database architecture with WAL mode support.                                                                                                                                   | [README](./task-api-sqlite/README.md)                                                                                                                                                                                  |

---

## 🌟 Featured Project: Media Processing Pipeline

The **[`media-processing-api`](./media-processing-api)** is live on Render:

- **Live Base URL**: [`https://api-lab-media-processing-api.onrender.com`](https://api-lab-media-processing-api.onrender.com)
- **Interactive OpenAPI / Swagger UI**: [`https://api-lab-media-processing-api.onrender.com/docs`](https://api-lab-media-processing-api.onrender.com/docs)
- **Health / Liveness Probe**: [`https://api-lab-media-processing-api.onrender.com/health`](https://api-lab-media-processing-api.onrender.com/health)
- **Readiness Probe**: [`https://api-lab-media-processing-api.onrender.com/ready`](https://api-lab-media-processing-api.onrender.com/ready)
- **Prometheus Metrics**: [`https://api-lab-media-processing-api.onrender.com/metrics`](https://api-lab-media-processing-api.onrender.com/metrics)

### Architecture Highlights:

- **Fast-Door Ingestion**: Immediate `202 Accepted` response with tracking UUID.
- **Zero-Memory Direct Ingestion**: Presigned Supabase Storage URLs bypass server RAM entirely for uploads.
- **Strict Security**: Binary magic bytes validation (`file-type`), IP rate limiters (`express-rate-limit`), and dynamic HMAC 1-hour signed URLs for private assets.
- **Responsive Variants**: Generates `thumbnail` (200x200), `medium` (800x800), and `full` (1920x1080) WebP formats off the main thread with Sharp.
- **Real-Time Streaming**: Server-Sent Events (SSE) at `GET /api/media/:id/events` for instant progress updates without polling.
- **Self-Healing & Free-Tier Resilient**: Scheduled GitHub Actions workflow (`.github/workflows/keep-alive.yml`) runs every 3 days to wake Render and prevent Supabase 7-day auto-pausing.

---

## 🛠️ Repository Workflows & Automation

- **[Keep-Alive & Prevent Pause](.github/workflows/keep-alive.yml)**: Automated GitHub Actions workflow that executes every 3 days at 12:00 UTC, performing a readiness check against the live deployment to ensure database integrity and avoid free-tier inactivity pauses.

---

## 🚀 Getting Started

Each project is fully standalone. Navigate to any directory to view its dedicated documentation and run instructions:

```bash
# Example: Running the Media Processing API
cd media-processing-api
npm install
npm run start:dev
```

---

## 📄 License

This repository is licensed under the [MIT License](https://github.com/MadG0blin359/API-Lab/blob/main/LICENSE).
