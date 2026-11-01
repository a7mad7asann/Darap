# DARB — Monitoring, Alerting & Health Probes Runbook

This runbook establishes the official observability standard, health probe contracts, structured logging specifications, operational metrics exposition, and incident response procedures for the DARB educational platform.

---

## 1. Observability Architecture Overview

DARB's observability architecture is **lightweight, provider-neutral, and privacy-preserving**. It makes production failures detectable, diagnosable, and measurable without exposing sensitive student data, tokens, passwords, or infrastructure credentials.

```
                  ┌──────────────────────────────────────────────┐
                  │          Ingress / Load Balancer             │
                  └──────────────┬────────────────┬──────────────┘
                                 │                │
            Liveness / Ready     │                │ User Traffic
            Probes (HTTP)        │                │
                                 ▼                ▼
                     ┌────────────────────────────────────────┐
                     │            DARB API Replica            │
                     │                                        │
                     │  ┌──────────────┐   ┌───────────────┐  │
                     │  │ HealthModule │   │ RequestId /   │  │
                     │  │ - /live      │   │ Logging       │  │
                     │  │ - /ready     │   │ Interceptors  │  │
                     │  │ - /deps      │   └───────┬───────┘  │
                     │  │ - /metrics   │           │          │
                     │  └──────────────┘           ▼          │
                     └─────────────┬────────── stdout (JSON)──┘
                                   │               │
        ┌──────────────────────────┤               ▼
        │                          │        [ Log Shipper ]
        ▼                          ▼        (Vector / Fluent Bit)
┌───────────────┐          ┌───────────────┐       │
│  PostgreSQL   │          │ Object Storage│       ▼
│  (Managed)    │          │  (S3 / R2)    │  [ Log Storage ]
└───────────────┘          └───────────────┘
```

---

## 2. Health Probe Contracts & Orchestrator Configuration

DARB provides three distinct health concepts to decouple basic process vitality from backing infrastructure availability.

### 2.1 Health Probe Endpoints

| Probe Type | Path | Purpose | Success (200) | Failure (503) | Max Expected Latency |
|---|---|---|---|---|---|
| **Liveness** | `GET /api/v1/health/live` | Checks process event loop & memory. Fast, independent of DB/storage. | `{"status":"ok","uptime":...,"memoryUsage":{...}}` | Never returns 503 unless event loop is blocked. | `< 10ms` |
| **Readiness** | `GET /api/v1/health/ready` | Confirms instance is ready to receive traffic (`SELECT 1` with 3s timeout). | `{"status":"ready","database":"connected","checks":{"database":"up"}}` | `{"status":"not_ready","database":"disconnected","checks":{"database":"down"}}` | `< 50ms` |
| **Dependencies** | `GET /api/v1/health/dependencies` | Deep inspection of backing services (PostgreSQL + S3/R2 storage). | `{"status":"ok"|"degraded","dependencies":{...}}` | `{"status":"down","dependencies":{"database":{"status":"down"}}}` | `< 150ms` |

> [!IMPORTANT]
> **Data Security Guarantee**: Health probe responses never leak database hostnames, credentials, connection strings, S3 buckets, or internal error stack traces.

### 2.2 Orchestrator Probe Configuration

#### Kubernetes Deployment Example
```yaml
livenessProbe:
  httpGet:
    path: /api/v1/health/live
    port: 4000
  initialDelaySeconds: 10
  periodSeconds: 10
  timeoutSeconds: 3
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /api/v1/health/ready
    port: 4000
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 2
```

#### Docker Compose Healthcheck Example
```yaml
services:
  api:
    image: darb-api:latest
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:4000/api/v1/health/ready"]
      interval: 10s
      timeout: 3s
      retries: 3
      start_period: 15s
```

---

## 3. Operational Metrics (`/api/v1/health/metrics`)

DARB provides an in-memory operational metrics collector that exposes request counts, response latency summaries, status classes, process memory, and dependency statuses.

### 3.1 Dual-Format Exposition

1. **JSON Format (Default)**:
   ```bash
   curl -s http://localhost:4000/api/v1/health/metrics
   ```
   *Response Envelope*:
   ```json
   {
     "success": true,
     "data": {
       "service": "darb-api",
       "environment": "production",
       "uptimeSeconds": 3612.45,
       "timestamp": "2026-11-01T12:00:00.000Z",
       "memory": {
         "rssBytes": 85983232,
         "heapTotalBytes": 45219840,
         "heapUsedBytes": 32549216
       },
       "http": {
         "totalRequests": 1420,
         "totalErrors": 2,
         "byStatusClass": { "2xx": 1395, "3xx": 23, "4xx": 2, "5xx": 0 },
         "routes": [
           {
             "method": "GET",
             "route": "/api/v1/health/live",
             "count": 720,
             "avgDurationMs": 2.1,
             "maxDurationMs": 8
           },
           {
             "method": "GET",
             "route": "/api/v1/courses/:id/sections",
             "count": 185,
             "avgDurationMs": 24.5,
             "maxDurationMs": 95
           }
         ]
       }
     }
   }
   ```

2. **Prometheus Exposition Format**:
   Triggered via query parameter `?format=prometheus` or header `Accept: text/plain`:
   ```bash
   curl -s -H "Accept: text/plain" http://localhost:4000/api/v1/health/metrics
   ```
   *Prometheus Scrape Configuration*:
   ```yaml
   scrape_configs:
     - job_name: 'darb-api'
       metrics_path: '/api/v1/health/metrics'
       params:
         format: ['prometheus']
       scrape_interval: 15s
       static_configs:
         - targets: ['api.darb.internal:4000']
   ```

### 3.2 Metrics Endpoint Ingress Protection (`METRICS_AUTH_TOKEN`)

By default, the metrics endpoint is unauthenticated at the application level to allow internal network scrapers (e.g., in private Kubernetes pods or Docker networks) to collect metrics without credential overhead.

To prevent public exposure of operational metrics (traffic volume, error counts, memory usage):

#### Method A: Bearer Token Authentication (Application Layer)
Configure `METRICS_AUTH_TOKEN` in the API environment (minimum 16 characters in production):
```bash
# Generate high-entropy bearer token
METRICS_AUTH_TOKEN=$(openssl rand -hex 24)
```

When configured:
1. All calls to `/api/v1/health/metrics` require header: `Authorization: Bearer <METRICS_AUTH_TOKEN>`.
2. Missing, malformed, or invalid tokens are rejected with `HTTP 401 Unauthorized`.
3. Tokens passed via URL query parameters (e.g. `?token=...`) are **strictly rejected**.
4. Comparison uses constant-time `crypto.timingSafeEqual` to prevent timing attacks.
5. In Prometheus scraper configuration, provide the token securely via `bearer_token` or `bearer_token_file`:
   ```yaml
   scrape_configs:
     - job_name: 'darb-api'
       metrics_path: '/api/v1/health/metrics'
       params:
         format: ['prometheus']
       bearer_token: 'YOUR_METRICS_AUTH_TOKEN'
       # Or read from secret file:
       # bearer_token_file: '/etc/prometheus/secrets/darb_metrics_token'
       scrape_interval: 15s
       static_configs:
         - targets: ['api.darb.example.com:443']
   ```

#### Method B: Ingress / Reverse Proxy Filtering (Network Layer)
If `METRICS_AUTH_TOKEN` is unset, the ingress / reverse proxy must restrict access to `/api/v1/health/metrics`:
- **Caddy**:
  ```caddy
  @metrics {
      path /api/v1/health/metrics*
      not remote_ip 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16 127.0.0.1
  }
  respond @metrics "Forbidden" 403
  ```
- **Nginx**:
  ```nginx
  location /api/v1/health/metrics {
      allow 10.0.0.0/8;
      allow 127.0.0.1;
      deny all;
      proxy_pass http://api:4000;
  }
  ```

### 3.3 Cardinality Protection Guarantees

To prevent metric store degradation (cardinality explosion):
- Dynamic UUID parameters (e.g. `/courses/6f2e82b7-a367...`) are automatically normalized to route templates (`/courses/:id`).
- High-entropy upload tickets and tokens are sanitized to `/:token`.
- Numeric resource IDs are normalized to `/:id`.
- Query parameters and hash fragments are stripped before recording.
- No user identifiers, email addresses, student names, or tenant IDs appear in metric labels.

---

## 4. Structured Logging & Privacy Redaction

### 4.1 Production JSON Format

In production (`NODE_ENV=production`), all HTTP requests and exceptions are emitted as single-line JSON records to `stdout` (info/warn) or `stderr` (error):

```json
{"timestamp":"2026-11-01T12:00:00.000Z","level":"info","service":"darb-api","environment":"production","requestId":"8f92c10b-4721-4f11-9a70-8b656711c109","method":"POST","route":"/api/v1/auth/login","statusCode":200,"durationMs":34}
```

### 4.2 Request ID Correlation

- Every request carries an `X-Request-Id` header.
- Client headers are validated against `/^[a-zA-Z0-9_-]{1,64}$/`. Malicious or excessively long headers are safely replaced with fresh UUIDv4 identifiers.
- The sanitized ID is propagated to:
  - HTTP response header `X-Request-Id`
  - API success and error response envelopes (`requestId`)
  - All structured log entries

### 4.3 Data Redaction Matrix

The following patterns are unconditionally redacted prior to logging:

| Sensitive Pattern | Source | Replacement |
|---|---|---|
| `Bearer [token]` | `Authorization` header | `Bearer [REDACTED]` |
| `Basic [credentials]` | `Authorization` header | `Basic [REDACTED]` |
| `darb_session=[session]` | `Cookie` header | `[REDACTED]` |
| `postgres://user:pass@host/db` | Connection strings | `postgres://user:[REDACTED]@host/db` |
| `password`, `secretKey`, `token` | Request/Response bodies | `[REDACTED]` |
| `X-Amz-Signature=...`, `ticket=...` | Storage signed URLs | `[REDACTED]` |

---

## 5. Core Production Alert Definitions & Response Runbooks

### Alert 1: High 5xx HTTP Error Rate (`http_5xx_rate_high`)

- **Signal / Metric**: `rate(darb_http_errors_total{status_class="5xx"}[5m]) / rate(darb_http_requests_total[5m]) * 100 > 1%`
- **Severity**: **Sev 1** (Critical) if > 5%; **Sev 2** (High) if 1%–5%.
- **Evaluation Window**: 5 minutes.
- **User Impact**: Teachers cannot grade or publish; students experience errors while taking exams or accessing lessons.
- **Immediate Triage**:
  ```bash
  # Check recent error logs matching 5xx
  docker logs --tail 200 darb-api-1 | grep '"level":"error"' | jq .
  
  # Inspect API readiness
  curl -i https://api.darb.example.com/api/v1/health/ready
  ```
- **Remediation**:
  1. Determine whether errors stem from database disconnections, unhandled validation errors, or external storage timeouts.
  2. If caused by a bad code release, execute rollback to previous image (`DEPLOYMENT_PLAYBOOK.md § 7.1`).
  3. If caused by database lock contention, inspect active locks via `MANAGED_POSTGRESQL_RUNBOOK.md § 4.3`.
- **Recovery Verification**: 5xx error rate drops below 0.1% for 10 consecutive minutes.

---

### Alert 2: High Request Latency (`http_latency_p95_high`)

- **Signal / Metric**: `darb_http_request_duration_ms{quantile="max"} > 1000` or p95 latency > 1000ms over 5m.
- **Severity**: **Sev 2** (High).
- **Evaluation Window**: 5 minutes.
- **User Impact**: Sluggish UI responsiveness, timeouts on large gradebook or roster queries.
- **Immediate Triage**:
  ```bash
  # Inspect metrics breakdown to identify the slow route
  curl -s https://api.darb.example.com/api/v1/health/metrics | jq '.data.http.routes[] | select(.avgDurationMs > 500)'
  
  # Check PostgreSQL slow queries
  psql "$DATABASE_URL" -c "SELECT pid, now() - query_start AS duration, query FROM pg_stat_activity WHERE state != 'idle' ORDER BY duration DESC LIMIT 5;"
  ```
- **Remediation**:
  1. If a specific query is stalling, verify table indexes (e.g., `CourseEnrollment(tenantId, studentId)` or `GradeRecord`).
  2. Check container CPU throttling (`docker stats darb-api-1`).
  3. Scale up API replica count if CPU utilization exceeds 80%.
- **Recovery Verification**: Latency p95 returns below 300ms.

---

### Alert 3: Database Connectivity Failure (`database_down`)

- **Signal / Metric**: `GET /api/v1/health/ready` returns HTTP 503 for 3 consecutive checks (30 seconds).
- **Severity**: **Sev 1** (Critical outage).
- **Evaluation Window**: 30 seconds.
- **User Impact**: Total API failure across all tenant workflows.
- **Immediate Triage**:
  ```bash
  # Check dependency probe output
  curl -s http://localhost:4000/api/v1/health/dependencies | jq .
  
  # Check direct PostgreSQL connectivity
  pg_isready -h "$PGHOST" -p "$PGPORT" -U darb_app -d darb_prod
  ```
- **Remediation**:
  1. Check PostgreSQL instance status on cloud console or host (`systemctl status postgresql`).
  2. Inspect PostgreSQL max connections limit: `SELECT count(*) FROM pg_stat_activity;`.
  3. Restart connection pooler (e.g. PgBouncer) or PostgreSQL service if deadlocked.
- **Recovery Verification**: Readiness probe returns HTTP 200 with `{"database":"connected"}`.

---

### Alert 4: Object Storage Connectivity Failure (`storage_unhealthy`)

- **Signal / Metric**: `GET /api/v1/health/dependencies` reports `dependencies.storage.status != "up"`.
- **Severity**: **Sev 2** (High).
- **Evaluation Window**: 2 minutes.
- **User Impact**: Lesson attachment downloads, student assignment submissions, and exam asset uploads fail.
- **Immediate Triage**:
  ```bash
  curl -s http://localhost:4000/api/v1/health/dependencies | jq '.data.dependencies.storage'
  ```
- **Remediation**:
  1. Verify S3/R2 API keys and secret expiration (`STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`).
  2. Test S3 endpoint reachability from the API container host:
     ```bash
     curl -I "$STORAGE_ENDPOINT"
     ```
  3. Check bucket IAM permissions (`s3:PutObject`, `s3:GetObject`, `s3:HeadBucket`).
- **Recovery Verification**: Dependency probe reports `dependencies.storage.status: "up"`.

---

### Alert 5: High Memory Usage (`process_memory_high`)

- **Signal / Metric**: `darb_process_memory_bytes{type="rss"} > 850000000` (850 MB on 1 GB container) for > 10m.
- **Severity**: **Sev 2** (High).
- **Evaluation Window**: 10 minutes.
- **User Impact**: Container risks OOM kill by Linux kernel, causing abrupt connection drops.
- **Immediate Triage**:
  ```bash
  # Check memory snapshot from metrics
  curl -s http://localhost:4000/api/v1/health/metrics | jq '.data.memory'
  
  # Inspect container memory usage
  docker stats --no-stream darb-api-1
  ```
- **Remediation**:
  1. Check for concurrent file buffer uploads or large gradebook exports held in memory.
  2. Verify Node.js garbage collection behavior: ensure `--max-old-space-size=768` is configured on 1 GB hosts.
  3. If memory leaks persist, execute a rolling restart of API replicas.
- **Recovery Verification**: RSS memory stabilizes below 600 MB.

---

### Alert 6: Rapid Process Restarts / CrashLoop (`process_crash_loop`)

- **Signal / Metric**: Container restart count increases by `> 3` within a 10-minute window.
- **Severity**: **Sev 1** (Critical).
- **Evaluation Window**: 10 minutes.
- **User Impact**: Intermittent request drops, session disconnects.
- **Immediate Triage**:
  ```bash
  # Check exit codes and reason for restart
  docker inspect darb-api-1 --format '{{.State.ExitCode}} {{.State.OOMKilled}} {{.State.Error}}'
  
  # Check startup logs for fatal initialization errors
  docker logs --tail 100 darb-api-1
  ```
- **Remediation**:
  1. Check if `env.validation.ts` failed on startup due to missing environment variables.
  2. Check for unhandled asynchronous exceptions in background intervals.
  3. Increase container memory limit if OOMKilled is `true`.
- **Recovery Verification**: Process runs continuously with `uptimeSeconds > 600`.

---

### Alert 7: Ingress Readiness Probe Failing (`readiness_probe_failing`)

- **Signal / Metric**: Load balancer / ingress marks instance unhealthy for `> 60s`.
- **Severity**: **Sev 1** (Critical if all replicas; Sev 2 if single replica).
- **Evaluation Window**: 60 seconds.
- **User Impact**: Reduced capacity or complete 502/504 Bad Gateway from reverse proxy.
- **Immediate Triage**:
  ```bash
  # Query local ready endpoint on the failing instance
  curl -i http://127.0.0.1:4000/api/v1/health/ready
  ```
- **Remediation**:
  1. Confirm port binding on port 4000.
  2. Check if local database connection pool is exhausted (`max: 10` in `DATABASE_URL`).
  3. If single replica is stalled, replace it with a fresh instance.
- **Recovery Verification**: Ingress returns instance to healthy routing pool.
