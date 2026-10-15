# 🚀 Embeddable Widget & Lead-Capture Platform

> A hardened, multi-tenant backend platform that lets customers create customizable embeddable widgets, install them with a single line of `<script>`, and safely process submissions from across the public internet — validated, abuse-protected, geo-enriched, and visualized in an owner dashboard powered by **Firebase Auth** and **Google Cloud Firestore**.

---

## 📑 Table of Contents

1. [Architecture Overview](#-architecture-overview)
2. [Tech Stack](#-tech-stack)
3. [Key Features & Hardened Protections](#-key-features--hardened-protections)
4. [Project Structure](#-project-structure)
5. [Firebase Dashboard Setup Guide](#-firebase-dashboard-setup-guide)
6. [Quick Start & Setup](#-quick-start--setup)
7. [Running & Seeding](#-running--seeding)
8. [Testing the Embed Widget (Cross-Origin Test Page)](#-testing-the-embed-widget)
9. [Acceptance Probes & Verification](#-acceptance-probes--verification)
10. [Deployment Guide (Render)](#-deployment-guide-render)
11. [API Documentation](#-api-documentation)
12. [Limitations & Engineering Trade-offs](#-limitations--engineering-trade-offs)

---

## 🏛 Architecture Overview

The system is split into three decoupled request paths:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 1. Widget Owner (Authenticated via Firebase Auth JWT)                                  │
│    POST /api/widgets          ──▶ Create / customize form & fields (Firestore)        │
│    GET  /api/widgets/:id/snippet ──▶ Generate single-line embed snippet                │
│    GET  /api/dashboard/stats  ──▶ View aggregated lead metrics & geo breakdown        │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 2. Customer Website (Any External Domain / Port, e.g. Port 5500 or production site)    │
│    <script src="http://api.domain.com/widget.v1.js?id=UUID">                           │
│    GET  /api/widgets/:id/config (Public · Cached with Cache-Control · Open CORS)       │
│    Dynamically injects responsive form into the host website DOM                       │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 3. Website Visitor (Public Internet Client)                                            │
│    POST /api/submissions (Public · CORS with OPTIONS preflight)                        │
│    ├── Boundary Validation (Zod rejects bad / oversized payloads with clean 4xx)      │
│    ├── Abuse & Spam Check (Rate limiting 429 + hidden Honeypot detection)             │
│    ├── Geo Enrichment Chain (ipstack / ip-api.com ➔ Fallback: ipapi.co ➔ Degrade)     │
│    ├── Database Persistence (Tenant-isolated Google Cloud Firestore)                   │
│    └── Safe Side Effects (Email/Webhook notification — failures NEVER fail the submit) │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### Mermaid Architecture Diagram

```mermaid
flowchart TD
    subgraph ExternalSite ["Customer Website (External Origin)"]
        A["Visitor Browser"]
        B["Embed Script (widget.v1.js)"]
    end

    subgraph BackendAPI ["Express 5 / TypeScript API Server"]
        C["GET /widget.v1.js<br/>(Cache-Control: public, max-age=86400)"]
        D["GET /api/widgets/:id/config<br/>(Cache-Control: public, max-age=60)"]
        E["POST /api/submissions"]
        
        subgraph Pipeline ["Hardened Ingestion Pipeline"]
            F["1. Submission Rate Limiter<br/>(Burst Protection: 429)"]
            G["2. Honeypot Anti-Spam Guard<br/>(Rejects Bot Submissions: 400)"]
            H["3. Zod Boundary Validator<br/>(Rejects Malformed: 400, Oversize: 413)"]
            I["4. Geo-IP Enrichment Service<br/>(Provider A ➔ Provider B ➔ Safe Null)"]
        end
        
        J["5. Safe Side Effect Dispatcher<br/>(Email / Webhook: Failures are caught)"]
        K["Admin API: /api/widgets & /api/dashboard<br/>(Protected by Firebase Auth JWT)"]
    end

    subgraph DataStore ["Google Cloud Firestore"]
        L[("widgets collection<br/>(Tenant-Isolated)")]
        M[("submissions collection<br/>(Stored Leads & Geo Data)")]
    end

    B -->|1. Loads script bundle| C
    B -->|2. Fetches config| D
    A -->|3. Submits Lead| E
    E --> F --> G --> H --> I
    I -->|4. Persists Lead| M
    I -->|5. Triggers async alert| J
    K -->|Manage widgets| L
    K -->|Query dashboard stats| M
```

---

## 🛠 Tech Stack

- **Runtime & Framework:** Node.js 24+ / Express 5 (TypeScript, ESM)
- **Database & Auth:** Google Cloud Firestore & Firebase Auth (via `firebase-admin` SDK)
- **Validation:** Zod 3 (boundary payload validation)
- **Abuse Protection:** `express-rate-limit` (per-IP burst protection) & Honeypot detection
- **Security:** Helmet, CORS (dynamic origin reflection with preflight support), signed Cookie Parser
- **Enrichment:** Geolocation Fallback Chain (Provider A: `ipstack` / `ip-api.com` $\rightarrow$ Provider B: `ipapi.co`)
- **Documentation:** OpenAPI 3.0 via Swagger UI (`/docs`)
- **Deployment Platform:** Render (ready for zero-downtime deployment)

---

## 🌟 Key Features & Hardened Protections

1. **Multi-Tenant Isolation:**
   Every widget and submission is associated with a specific tenant (`user_id`). The backend strictly scopes queries by tenant ID.
2. **Fast, Cached Delivery:**
   - The embed script (`/widget.v1.js`) is served with `Cache-Control: public, max-age=86400, immutable`.
   - The public widget configuration (`/api/widgets/:id/config`) is served with `Cache-Control: public, max-age=60, stale-while-revalidate=30` and stripped of tenant secrets.
3. **Resilient Geolocation Fallback Chain:**
   - **Provider A:** `ipstack` API (or free `ip-api.com` if no key provided).
   - **Provider B:** `ipapi.co` fallback.
   - **Graceful Degradation:** If both providers are offline or rate-limited, the submission **still succeeds** (`201 Created`) without geo data.
4. **Honeypot Anti-Spam Defense:**
   The widget renders hidden input fields (`_hp` and `website_url_hp`) that are invisible to human users. Automated bots filling these fields are immediately blocked (`400 Bad Request`).
5. **Decoupled Safe Side Effects:**
   Post-submission alerts (email logs or outgoing webhooks) run inside safe error boundaries. A failing or crashing notification service will **never** cause the visitor's submission to fail.
6. **Owner Analytics Dashboard:**
   Aggregates lead volume across time windows (24h, 7d, 30d), generates daily submission trends, provides geographic country distributions, and lists recent activity.

---

## 📁 Project Structure

```text
lead-capture-api/
├── public/
│   ├── widget.v1.js         # Pure JS embeddable client bundle
│   └── demo.html            # In-browser widget test page
├── test-site/
│   └── index.html           # External customer website test page (different origin)
├── src/
│   ├── config/
│   │   ├── env.ts           # Zod-validated environment config
│   │   └── firebase.ts      # Firebase Admin SDK & Firestore initialization
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── widget.controller.ts
│   │   ├── submission.controller.ts
│   │   └── dashboard.controller.ts
│   ├── middlewares/
│   │   ├── auth.middleware.ts       # Firebase ID token (JWT) validator
│   │   ├── csrf.middleware.ts       # Double-submit cookie CSRF (exempts public leads)
│   │   ├── rate-limit.middleware.ts # Burst rate limiters (429)
│   │   ├── validate.middleware.ts   # Zod request boundary validator
│   │   └── error.handler.ts         # Global centralized error handler (4xx/500)
│   ├── routes/
│   │   ├── widget.routes.ts
│   │   ├── submission.routes.ts
│   │   ├── dashboard.routes.ts
│   │   └── index.ts
│   ├── services/
│   │   ├── widget.service.ts
│   │   ├── submission.service.ts
│   │   ├── geo.service.ts           # Fallback chain: Provider A ➔ B ➔ Degrade
│   │   ├── notification.service.ts  # Safe decoupled side effects
│   │   └── dashboard.service.ts     # Aggregation queries
│   ├── types/
│   │   └── index.ts                 # Domain interfaces and DTOs
│   ├── utils/
│   │   ├── seed.ts                  # Database seeding script for Firestore
│   │   └── swagger.ts               # OpenAPI 3.0 specification
│   ├── app.ts                       # Express app assembly & CORS configuration
│   └── server.ts                    # HTTP server bootstrapper
├── firestore.rules                  # Firestore security rules
├── capstone.yaml                    # Automated evaluator manifest
├── render.yaml                      # Render Blueprint deployment configuration
└── package.json
```

---

## 🧭 Firebase Dashboard Setup Guide

Follow these steps in your [Firebase Console](https://console.firebase.google.com/):

### 1. Create / Select a Firebase Project
- Click **Add Project** and give it a name (e.g. `lead-capture-platform`).
- Disable Google Analytics (optional).

### 2. Enable Cloud Firestore
- In the left sidebar, navigate to **Build** $\rightarrow$ **Firestore Database**.
- Click **Create Database**.
- Choose a location close to your server (e.g., `nam5 (us-central)`).
- Start in **Production mode**.
- *(Optional)* In the **Rules** tab, paste the rules from [`firestore.rules`](./firestore.rules) and click **Publish**.

### 3. Enable Firebase Authentication
- In the left sidebar, navigate to **Build** $\rightarrow$ **Authentication**.
- Click **Get Started**.
- Under the **Sign-in method** tab, click **Email/Password** and enable the **Email/Password** toggle. Click **Save**.

### 4. Generate Service Account Private Key
- Click the ⚙️ (Gear Icon) next to *Project Overview* $\rightarrow$ **Project settings**.
- Navigate to the **Service accounts** tab.
- Click **Generate new private key** and confirm by clicking **Generate key**.
- A `.json` file will download containing your credentials:
  - `project_id`
  - `client_email`
  - `private_key`

### 5. Get Web API Key (Optional, for email/password REST sign-in)
- In **Project settings** $\rightarrow$ **General** tab, copy the **Web API Key**.

---

## ⚡ Quick Start & Setup

### Prerequisites

- Node.js 20+ (Node.js 24 recommended)
- A Firebase project with Firestore and Authentication enabled

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/MadG0blin359/API-Lab/tree/main/lead-capture-api
cd lead-capture-api
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Add your Firebase Service Account credentials into `.env`:

```env
PORT=3000
API_BASE_URL=http://localhost:3000

# From your Firebase Service Account JSON
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-firebase-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"

# Web API Key from Firebase Project Settings > General
FIREBASE_API_KEY=AIzaSy...

COOKIE_SECRET=super-secret-cookie-encryption-key-min-16
CSRF_SECRET=super-secret-csrf-token-secret-key-min-16
```

---

## 🚀 Running & Seeding

### Seed Demo Data

Populate Firestore with a demo account (`demo@flyrank.com` / `DemoPassword123!`), a pre-configured widget (`00000000-0000-0000-0000-000000000001`), and sample leads:

```bash
npm run seed
```

### Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3000`.

### Typecheck & Production Build

```bash
npm run typecheck
npm run build
npm start
```

---

## 🌐 Testing the Embed Widget

### 1. View the Demo Page

Open `http://localhost:3000/demo.html` in your browser to test the interactive widget directly.

### 2. Cross-Origin Simulation (The Customer Website)

To test cross-origin embedding on a different origin:
1. Serve the `test-site` directory from a secondary port (e.g. 5500):
   ```bash
   npx serve test-site -p 5500
   ```
   *(Or simply open `test-site/index.html` in your browser as a `file://` URL).*
2. Enter your Widget ID (default seeded ID: `00000000-0000-0000-0000-000000000001`).
3. Fill in the form and click **Submit**.
4. The submission will successfully post across origins to `http://localhost:3000/api/submissions`.

### Single-Line Embed Snippet:

```html
<script src="http://localhost:3000/widget.v1.js?id=00000000-0000-0000-0000-000000000001" data-widget-id="00000000-0000-0000-0000-000000000001" async defer></script>
```

---

## 🧪 Acceptance Probes & Verification

| Probe | Test Description | Verification Command / Result |
|---|---|---|
| **Probe 1** | Cross-Origin Submission | `POST /api/submissions` with `Origin: http://localhost:5500` returns `201 Created` and appears in dashboard. |
| **Probe 2** | Boundary Validation | Malformed inputs return `400 Bad Request`; payloads > 1MB return `413 Payload Too Large`. Never `500`. |
| **Probe 3** | Burst Rate Limiting | 10 rapid submissions trigger `429 Too Many Requests`. Subsequent requests succeed once window resets. |
| **Probe 4** | Geo Fallback Chain | `MOCK_GEO_PROVIDER_A_FAIL=true` falls back to Provider B (`ipapi.co`). If both fail, degrades gracefully without failing. |
| **Probe 5** | Safe Side Effect | `MOCK_NOTIFICATION_FAIL=true` simulates email/webhook crash; submission **still returns 201 success**. |
| **Probe 6** | Honeypot Anti-Spam | Populating `_hp` or `website_url_hp` causes the submission to be blocked with `400 Bad Request`. |

---

## ☁️ Deployment Guide (Render)

This repository includes a [`render.yaml`](render.yaml) specification for zero-configuration deployment on [Render](https://render.com).

### Step-by-Step Render Deployment:

1. Push this repository to **GitHub**.
2. Log in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** $\rightarrow$ **Web Service**.
4. Connect your GitHub repository.
5. Set the following build and start commands:
   - **Environment:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/health`
6. Add the following **Environment Variables** in Render:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `FIREBASE_PROJECT_ID`: `your-firebase-project-id`
   - `FIREBASE_CLIENT_EMAIL`: `your-service-account-client-email`
   - `FIREBASE_PRIVATE_KEY`: `your-service-account-private-key`
   - `FIREBASE_API_KEY`: `your-firebase-web-api-key`
   - `COOKIE_SECRET`: `(generate 32-char string)`
   - `CSRF_SECRET`: `(generate 32-char string)`
   - `CSRF_ENABLED`: `true`
   - `CORS_ORIGIN`: `*`
   - `API_BASE_URL`: `https://your-service-name.onrender.com`
7. Click **Deploy Web Service**. Once deployed, your Swagger API docs will be live at `https://your-service-name.onrender.com/docs`.

---

## 📖 API Documentation

Interactive Swagger documentation is available at `/docs`.

### Core Endpoints:

#### Public Delivery & Submission
- `GET /widget.v1.js` — Embeddable JavaScript bundle (`Cache-Control: public, max-age=86400`).
- `GET /api/widgets/:id/config` — Public widget configuration (`Cache-Control: public, max-age=60`).
- `POST /api/submissions` — Public submission endpoint (Rate limited, Honeypot checked, Geo-enriched).

#### Authenticated Tenant Management (`Authorization: Bearer <Firebase_ID_Token>`)
- `POST /api/auth/signup` — Register new tenant via Firebase Auth.
- `POST /api/auth/login` — Sign in and obtain Firebase session token.
- `GET /api/widgets` — List owner's widgets.
- `POST /api/widgets` — Create new widget.
- `GET /api/widgets/:id/snippet` — Retrieve one-line embed snippet.
- `GET /api/submissions` — List and filter captured leads.
- `GET /api/dashboard/stats` — Retrieve time-series stats, lead counts, and geographic breakdown from Firestore.

---

## ⚖️ Limitations & Engineering Trade-offs

1. **In-Memory Rate Limiting:**
   `express-rate-limit` currently tracks request counters in memory. In a distributed multi-instance deployment (e.g. clustered containers), a Redis-backed store (`rate-limit-redis`) would be preferred to maintain a shared counter across instances.
2. **Synchronous Fallback Execution:**
   The Geo-IP fallback chain executes sequentially with tight timeouts (3.5s per provider). While fast for normal requests, if both providers experience DNS lag, response latency may reach ~7s before graceful degradation.
3. **Double-Submit CSRF on Public APIs:**
   Standard CSRF cookies cannot be used for cross-origin public widgets embedded on external domains. Security is instead enforced via boundary schema validation, per-IP rate limits, and bot honeypot detection.
