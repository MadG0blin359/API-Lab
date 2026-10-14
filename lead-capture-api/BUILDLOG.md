# BUILDLOG — Development & AI-Assistance Log

## 1. Project Initialization & Architecture Design

### Challenge Identified
The project requires handling cross-origin requests from unpredictable origins across the public internet. The starter template had a global CSRF middleware (`csrf-csrf`) and a static `CORS_ORIGIN` setting that would have completely blocked cross-origin widget submissions and prevented browser clients on external customer websites from making submissions.

### Design Decisions
1. **CSRF Scoping:** Modified `src/middlewares/csrf.middleware.ts` to exempt public lead ingestion (`/api/submissions`), while keeping CSRF protection active for state-changing browser sessions.
2. **CORS Flexibility:** Configured `cors()` in `src/app.ts` to permit cross-origin requests and handle preflight `OPTIONS` requests from any host.
3. **Multi-Tenancy:** Implemented Supabase Row Level Security (RLS) on both `widgets` and `submissions` tables to ensure tenant isolation: one user can never read, modify, or delete another tenant's widgets or captured leads.
4. **Geo-Location Fallback Chain:** Designed `geoService` with an ordered resilience chain: Provider A (`ipstack` or `ip-api.com`) $\rightarrow$ Provider B (`ipapi.co`) $\rightarrow$ Graceful degradation (safe null enrichment). Added deterministic test toggles (`MOCK_GEO_PROVIDER_A_FAIL`, `MOCK_GEO_PROVIDER_B_FAIL`) to satisfy Acceptance Probe 4.
5. **Decoupled Side Effects:** Implemented `notificationService` to handle lead notifications asynchronously without blocking or failing the main HTTP submission response. Added `MOCK_NOTIFICATION_FAIL` to satisfy Acceptance Probe 5.

---

## 2. AI Assistance Log

| Component / Task | Where AI Assisted | What Was Corrected / Customized Manually |
|---|---|---|
| **SQL Schema (`src/config/schema.sql`)** | Generated initial table schemas for `widgets` and `submissions`. | Added RLS policies for tenant isolation, foreign keys to `auth.users`, and indices on `user_id`, `widget_id`, and `created_at`. |
| **Widget JavaScript (`public/widget.v1.js`)** | Scaffolded pure JavaScript DOM injection and styles. | Added scoped `lc-` CSS prefixes, honeypot inputs (`_hp` and `website_url_hp`), dynamic field rendering, and accessible form validation. |
| **CORS & CSRF Handling** | Highlighted the conflict between double-submit CSRF cookies and public cross-origin API calls. | Configured selective bypass for `/api/submissions` in `csrf.middleware.ts` and enabled cross-origin resource policy in Helmet. |
| **Error Handling (`error.handler.ts`)** | Provided standard Express 5 error middleware. | Added explicit interception for 413 `entity.too.large` and JSON `SyntaxError` to ensure malformed and oversized payloads return clean 4xx responses without 500s (Probe 2). |
| **Dashboard Metrics (`dashboard.service.ts`)** | Suggested aggregation queries. | Built tenant-isolated time-series aggregations, widget breakdowns, and geographic country distributions. |

---

## 3. Key Lessons Learned
- **Cross-Origin Security:** Public widgets cannot rely on session cookies or standard CSRF tokens. Security must instead rely on rate limiting per IP/widget, payload boundary validation, and honeypot bot detection.
- **Graceful Degradation:** External dependencies (like Geo APIs or SMTP servers) inevitably experience outages. Software built for the public internet must degrade safely—capturing the lead even if enrichment or notifications fail.
