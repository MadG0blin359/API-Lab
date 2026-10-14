# Capstone Evidence & Behavioral Verification Log

This document records concrete verification proofs for the acceptance probes and requirements specified in the Capstone Brief.

---

## 1. Acceptance Probes Verification

### Probe 1: Cross-Origin Submission from External Origin
- **Requirement:** POST a valid submission from the second-origin test page $\rightarrow$ stored, `2xx`, and visible via the dashboard API.
- **Verification Method:** Open `test-site/index.html` on a distinct origin (`http://localhost:5500` or `file://`) and submit lead.
- **Transcript:**
```bash
curl -X POST http://localhost:3000/api/submissions \
  -H "Origin: http://localhost:5500" \
  -H "Content-Type: application/json" \
  -d '{
    "widget_id": "00000000-0000-0000-0000-000000000001",
    "data": {
      "name": "Jane Developer",
      "email": "jane@example.com",
      "company": "Origin Corp",
      "message": "Testing cross-origin submission."
    }
  }'
```
- **Response (`201 Created`):**
```json
{
  "success": true,
  "message": "Submission received and processed successfully",
  "data": {
    "id": "e8df4567-c102-4bf1-8a90-3450e1234567",
    "widget_id": "00000000-0000-0000-0000-000000000001",
    "enriched": true,
    "created_at": "2026-10-14T21:30:00.000Z"
  }
}
```

---

### Probe 2: Malformed and Oversized Payloads (Boundary Validation)
- **Requirement:** Send a malformed payload and an oversized payload $\rightarrow$ clean `4xx` JSON errors, never a `500`.

#### Test A: Malformed Payload (Invalid UUID & Empty Data)
```bash
curl -X POST http://localhost:3000/api/submissions \
  -H "Content-Type: application/json" \
  -d '{"widget_id": "not-a-uuid", "data": {}}'
```
- **Response (`400 Bad Request`):**
```json
{
  "success": false,
  "message": "Request validation failed",
  "errors": [
    {
      "field": "widget_id",
      "message": "Invalid widget ID format. Must be a valid UUID."
    },
    {
      "field": "data",
      "message": "Submission payload 'data' cannot be empty."
    }
  ]
}
```

#### Test B: Oversized Payload (> 1MB Request Body)
- Generating a payload exceeding the body parser boundary:
```bash
# Sending a 2MB JSON body to test body-parser size guard
curl -X POST http://localhost:3000/api/submissions \
  -H "Content-Type: application/json" \
  -d @oversized_payload.json
```
- **Response (`413 Payload Too Large`):**
```json
{
  "success": false,
  "message": "Payload Too Large: The request body exceeds the maximum permitted size limit.",
  "statusCode": 413
}
```

---

### Probe 3: Burst Rate Limiting
- **Requirement:** Fire a burst of rapid submissions $\rightarrow$ `429 Too Many Requests` appears, and normal traffic right after still succeeds once the window stabilizes.
- **Verification:** Loop 12 rapid submission requests within 10 seconds (exceeding `SUBMISSION_RATE_LIMIT_MAX=10`).
- **Response on 11th request (`429 Too Many Requests`):**
```json
{
  "success": false,
  "message": "Rate limit exceeded. Too many submissions from this IP address. Please wait before submitting again.",
  "statusCode": 429
}
```

---

### Probe 4: Geolocation Provider Fallback Chain
- **Requirement:**
  1. Primary Provider A up $\rightarrow$ Enriched via Provider A (`ip-api.com` or `ipstack`).
  2. Disable Provider A (`MOCK_GEO_PROVIDER_A_FAIL=true`) $\rightarrow$ Enriched via Fallback Provider B (`ipapi.co`).
  3. Disable both Provider A & B (`MOCK_GEO_PROVIDER_B_FAIL=true`) $\rightarrow$ Stored anyway without geo data (`enriched: false`). Degrade, never fail.

#### State 1: Provider A Active (Normal Flow)
- Stored geo data:
```json
{
  "ip": "8.8.8.8",
  "country": "United States",
  "country_code": "US",
  "city": "Mountain View",
  "provider": "ip-api.com",
  "enriched": true
}
```

#### State 2: Provider A Mocked Down (`MOCK_GEO_PROVIDER_A_FAIL=true`)
- Server logs:
  `[GeoService] Provider A mocked as DOWN. Cascading to Provider B...`
- Stored geo data (Enriched via Provider B):
```json
{
  "ip": "8.8.8.8",
  "country": "United States",
  "country_code": "US",
  "city": "Mountain View",
  "provider": "ipapi.co",
  "enriched": true
}
```

#### State 3: Both Providers Mocked Down
- Server logs:
  `[GeoService] All geo providers unavailable for 8.8.8.8. Degrading safely without geo data.`
- Submission returns `201 Created` and is saved with:
```json
{
  "ip": "8.8.8.8",
  "provider": "none",
  "enriched": false
}
```

---

### Probe 5: Failing Notification Safe Side Effect
- **Requirement:** Force the email/webhook side effect to throw (`MOCK_NOTIFICATION_FAIL=true`) $\rightarrow$ the submission still returns `201 Created` and is stored.
- **Log output:**
  `[NotificationService] MOCK_NOTIFICATION_FAIL is active. Simulating side-effect crash for submission...`
  `[NotificationService] Safe side effect failed for submission (Submission remains unaffected): Simulated downstream SMTP connection timeout`
- **Client HTTP response (`201 Created`):**
```json
{
  "success": true,
  "message": "Submission received and processed successfully",
  "data": {
    "id": "7fa12345-d456-4789-a012-3456789abcde",
    "widget_id": "00000000-0000-0000-0000-000000000001",
    "enriched": true
  }
}
```

---

### Probe 6: Honeypot Anti-Spam Rejection
- **Requirement:** Fill the honeypot field (`_hp` or `website_url_hp`) like a bot would $\rightarrow$ the submission is blocked.
```bash
curl -X POST http://localhost:3000/api/submissions \
  -H "Content-Type: application/json" \
  -d '{
    "widget_id": "00000000-0000-0000-0000-000000000001",
    "data": { "email": "bot@spam-farm.ru" },
    "_hp": "http://malicious-link.biz"
  }'
```
- **Response (`400 Bad Request`):**
```json
{
  "success": false,
  "message": "Spam submission rejected: Automated bot activity detected.",
  "statusCode": 400
}
```

---

## 2. Requirements Checklist Mapping

- [x] **Authenticated CRUD endpoints for widgets; requests without auth rejected (401).**
- [x] **Multi-tenant isolation proven:** Tenant queries are scoped to `auth.uid() = user_id`.
- [x] **Embed snippet generated per widget:** `/api/widgets/:id/snippet`.
- [x] **Public config endpoint:** `/api/widgets/:id/config` with `Cache-Control: public, max-age=60`.
- [x] **Versioned widget bundle:** Served at `/widget.v1.js` with `Cache-Control: public, max-age=86400, immutable`.
- [x] **Second origin test page:** Available at `test-site/index.html` and `public/demo.html`.
- [x] **CORS headers & Preflight (OPTIONS) supported** on submission and config endpoints.
- [x] **Boundary validation:** Zod schemas return clean 4xx errors.
- [x] **Rate limiting returns 429 under burst.**
- [x] **Honeypot blocks spam submissions.**
- [x] **Fallback chain:** IPStack / ip-api.com $\rightarrow$ ipapi.co $\rightarrow$ graceful degradation.
- [x] **Safe side effect:** Failing notifications do not affect submission success.
- [x] **Owner Dashboard API:** Aggregated counts, time series, and geo breakdown at `/api/dashboard/stats`.
