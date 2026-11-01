# DARB — Production Deployment Playbook

This document defines the official, provider-neutral deployment procedures, environment configuration, service topology, readiness checks, and rollback strategies for the DARB educational platform.

---

## 1. Supported Runtime & Infrastructure Prerequisites

| Component | Required Version | Notes |
|---|---|---|
| **Node.js** | `>= 18.20.0` or `>= 20.10.0` (LTS) | 64-bit runtime. Node 18/20 Alpine is used in official containers. |
| **Package Manager** | `pnpm` `12.16.1` | Enabled via Corepack (`corepack enable && corepack prepare pnpm@12.16.1 --activate`). |
| **Database** | PostgreSQL `16.x` | Managed PostgreSQL with Row-Level Security (RLS) support. |
| **Memory** | Minimum 1 GB RAM per API replica | Argon2id password hashing consumes ~19 MB RAM per concurrent hash operation. |
| **CPU** | Minimum 1 vCPU per replica | Multi-core recommended for compute and crypto operations. |
| **Storage** | 10 GB+ SSD for application images | Persistent file storage uses object storage (S3/R2). |

---

## 2. DNS & HTTPS Prerequisites

DARB strictly enforces HTTPS in production environments for session cookie security (`darb_session`) and cryptographic integrity.

### 2.1 Domain Topologies
Choose one of the following validated topology options:

#### Option A: Subdomains with Shared Apex (Recommended)
- **Frontend URL**: `https://darb.example.com`
- **Backend API URL**: `https://api.darb.example.com`
- **Cookie Attributes**: `COOKIE_SAME_SITE=lax`, `COOKIE_SECURE=true`.
- Shared apex (`example.com`) ensures `SameSite=Lax` cookies are forwarded on standard cross-subdomain API navigation without browser third-party cookie restrictions.

#### Option B: Single Domain with Reverse Proxy Path Routing
- **Frontend URL**: `https://darb.example.com`
- **Backend API URL**: `https://darb.example.com/api` (reverse-proxied to port 4000 with path rewrite `/api/v1` -> `/api/v1`).
- **Cookie Attributes**: `COOKIE_SAME_SITE=lax`, `COOKIE_SECURE=true`.
- Zero cross-origin requests; highest compatibility across all browser security tiers.

#### Option C: Distinct Apex Domains
- **Frontend URL**: `https://darb-portal.edu`
- **Backend API URL**: `https://darb-api.cloud`
- **Cookie Attributes**: `COOKIE_SAME_SITE=none`, `COOKIE_SECURE=true`.
- *Caution*: Third-party cookie restrictions in Safari and modern Chrome may require custom domain aliasing.

---

## 3. Architecture & Service Topology

```
                         [ Internet / Client Browsers ]
                                       │
                                       ▼ (HTTPS:443)
                 ┌───────────────────────────────────────────┐
                 │       Reverse Proxy / Ingress / CDN       │
                 │   (TLS Termination & Security Headers)    │
                 └─────────────┬───────────────┬─────────────┘
                               │               │
        Route: / (Frontend)    │               │ Route: /api/v1 (Backend)
                               ▼               ▼
                     ┌──────────────────┐    ┌──────────────────┐
                     │    @darb/web     │    │    @darb/api     │
                     │  Next.js 14 SSR  │    │    NestJS 10     │
                     │   (Port 3000)    │    │   (Port 4000)    │
                     └──────────────────┘    └─────────┬────────┘
                                                       │
                                                       │ (Private Subnet / TLS)
                                                       ▼
                                             ┌──────────────────┐
                                             │ Managed Postgres │
                                             │  PostgreSQL 16   │
                                             │ (RLS + Dual Role)│
                                             └──────────────────┘
```

---

## 4. Environment Variables & Secret Configuration

Never commit production secrets to Git. Inject environment variables via your infrastructure secret management tier (e.g. AWS Systems Manager Parameter Store, HashiCorp Vault, Kubernetes Secrets, or Docker Secrets).

### 4.1 Backend Service (`@darb/api`)

| Variable | Required | Default | Production Example / Rule |
|---|---|---|---|
| `NODE_ENV` | **Yes** | `development` | Set to `production`. |
| `PORT` | No | `4000` | Application bind port (`4000`). |
| `DATABASE_URL` | **Yes** | - | Migration connection URL connecting as schema owner (`darb_migrator`). Must include `sslmode=require`. Format: `postgresql://darb_migrator:<STRONG_PASSWORD>@<DB_HOST>:5432/<DB_NAME>?sslmode=require` |
| `APP_DATABASE_URL` | **Yes** | - | Runtime connection URL connecting as unprivileged app role (`darb_app`, `NOSUPERUSER NOBYPASSRLS`). Format: `postgresql://darb_app:<STRONG_PASSWORD>@<DB_HOST>:5432/<DB_NAME>?sslmode=require` |
| `SESSION_SECRET` | **Yes** | - | Cryptographically random secret for JWT signing. Must be at least 32 characters. Generate using: `openssl rand -base64 36`. Startup validation will reject default or dictionary strings. |
| `COOKIE_NAME` | No | `darb_session` | Name of the HTTP session cookie. |
| `COOKIE_SECURE` | **Yes** | `false` | **Must be set to `true`** in production. Startup validation aborts if `false`. |
| `COOKIE_SAME_SITE` | No | `lax` | Set to `lax` (or `none` if distinct apex domains). |
| `NEXT_PUBLIC_APP_URL` | **Yes** | - | Fully qualified URL of the web frontend (e.g. `https://darb.example.com`). Used by CORS origin validator. |
| `CORS_ALLOWED_ORIGINS` | No | - | Comma-separated list of additional trusted origins (e.g. `https://admin.example.com`). |
| `ENABLE_SWAGGER` | No | `false` | Defaults to `false` in production. Set to `false` to keep `/api/docs` unmounted. |
| `RATE_LIMIT_TTL_MS` | No | `60000` | Rate limiter window in milliseconds (default 1 minute). |
| `RATE_LIMIT_MAX_ATTEMPTS` | No | `5` | Maximum failed login attempts before temporary account lockout. |

### 4.2 Frontend Service (`@darb/web`)

| Variable | Required | Default | Production Example / Rule |
|---|---|---|---|
| `NODE_ENV` | **Yes** | `development` | Set to `production`. |
| `PORT` | No | `3000` | Port for the Next.js production server. |
| `NEXT_PUBLIC_API_URL` | **Yes** | - | Public endpoint of the API accessible by client browsers (e.g. `https://api.darb.example.com/api/v1` or `https://darb.example.com/api/v1`). |
| `NEXT_TELEMETRY_DISABLED` | No | `1` | Recommended to set to `1` to eliminate outgoing telemetry. |

---

## 5. Deployment Step-by-Step Procedure

### Step 1: Pre-Deployment Build & Verification
Always execute pre-flight validation on the release candidate commit:
```bash
# 1. Install locked dependencies
pnpm install --frozen-lockfile

# 2. Type-check and lint
pnpm typecheck
pnpm lint

# 3. Execute unit tests
pnpm test

# 4. Build all packages
pnpm build
```

### Step 2: Database Migration Deployment
Apply Prisma schema migrations to the managed database using the administrative connection:
```bash
# Executed using DATABASE_URL (darb_migrator role)
pnpm --filter @darb/api prisma:migrate
```
*Note*: The migration runner checks `migration_lock.toml` and executes any unapplied SQL migration files in a single transactional sequence.

### Step 3: Deploy & Start Backend API
Deploy the container or artifact for `@darb/api`:
```bash
# Standalone execution
cd apps/api
NODE_ENV=production node dist/main

# Or via pnpm workspace script
pnpm --filter @darb/api start:prod
```

### Step 4: Validate Backend Readiness
Query the readiness probe before routing traffic to the newly deployed instance:
```bash
curl -f http://127.0.0.1:4000/api/v1/health/ready
```
Expected response (HTTP 200):
```json
{
  "status": "ready",
  "database": "connected",
  "timestamp": "2026-11-01T10:00:00.000Z"
}
```

### Step 5: Deploy & Start Frontend Web
Once the backend API passes readiness checks, deploy `@darb/web`:
```bash
# Standalone execution
cd apps/web
pnpm start

# Or via pnpm workspace script
pnpm --filter @darb/web start
```

### Step 6: Initial Administrator Provisioning (Day 1 Only)
On initial deployment, provision the root platform administrator using the non-interactive CLI script:
```bash
INITIAL_ADMIN_USERNAME="admin.darb" \
INITIAL_ADMIN_EMAIL="admin@darb.example.com" \
INITIAL_ADMIN_DISPLAY_NAME="مدير منصة درب" \
INITIAL_ADMIN_PASSWORD="<GENERATE_STRONG_RANDOM_PASSWORD>" \
pnpm db:admin
```
*Security Guarantee*: This script uses Argon2id password hashing and creates **only** the specified admin user without seeding any test teachers, fake courses, or dummy student accounts.

---

## 6. Post-Deployment Verification (Smoke Tests) & Observability

Execute the following verification sequence against the production URL:

1. **Liveness, Readiness & Dependencies**:
   ```bash
   # Liveness (process health & memory)
   curl -i https://api.darb.example.com/api/v1/health/live
   # HTTP/2 200, status: "ok"
   
   # Readiness (PostgreSQL connectivity)
   curl -i https://api.darb.example.com/api/v1/health/ready
   # HTTP/2 200, status: "ready", database: "connected"

   # Backing Dependencies (PostgreSQL + S3/R2 storage)
   curl -i https://api.darb.example.com/api/v1/health/dependencies
   # HTTP/2 200, status: "ok", dependencies: { database: { status: "up" }, storage: { status: "up" } }
   ```

2. **Operational Metrics Collection**:
   ```bash
   # JSON format metrics
   curl -i https://api.darb.example.com/api/v1/health/metrics

   # Prometheus exposition format
   curl -i -H "Accept: text/plain" https://api.darb.example.com/api/v1/health/metrics
   ```

3. **Frontend Availability**:
   ```bash
   curl -i -I https://darb.example.com/
   # HTTP/2 200 OK, Content-Type: text/html
   ```

4. **CORS Headers Verification**:
   ```bash
   curl -i -X OPTIONS https://api.darb.example.com/api/v1/auth/me \
     -H "Origin: https://darb.example.com" \
     -H "Access-Control-Request-Method: GET"
   # Access-Control-Allow-Origin: https://darb.example.com
   # Access-Control-Allow-Credentials: true
   ```

5. **Cookie Security Verification**:
   ```bash
   curl -i -X POST https://api.darb.example.com/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"identifier":"admin.darb","password":"<WRONG_PASS>"}'
   # Confirms 401 Unauthorized; structured audit log emitted to stdout with X-Request-Id correlation.
   ```

For complete alerting thresholds, log shipping configuration, and incident triage runbooks, consult [MONITORING_AND_ALERTING_RUNBOOK.md](file:///home/user/Documents/Darap/docs/operations/MONITORING_AND_ALERTING_RUNBOOK.md).

---

## 7. Rollback Procedures & Failure Response

### 7.1 Application-Only Rollback
If a newly deployed code version introduces a bug that does not depend on database changes:
1. Re-route traffic at the ingress / reverse proxy layer to the previous stable container image or process.
2. Invalidate CDN cache for frontend static assets (`_next/static`).
3. Confirm health via `/api/v1/health/ready`.

### 7.2 Handling Database Schema Changes (The Expand-Contract Principle)
Prisma migrations deploy SQL changes to PostgreSQL. In production:
> [!IMPORTANT]
> **Never blindly restore an old database snapshot or backup after new writes have occurred in production.** Doing so will destroy newly created student submissions, exam answers, teacher grades, and audit records.

#### Safe Schema Evolution Rules:
1. **Phase 1 (Expand)**: All schema migrations must be strictly backward-compatible with the currently running application code:
   - Add new columns as `NULL` or with safe `DEFAULT` values.
   - Add new tables and RLS policies.
   - Do not drop columns, rename columns, or add non-nullable columns without defaults.
2. **Phase 2 (Deploy)**: Deploy the new application version that uses both the old and new schema fields.
3. **Phase 3 (Contract)**: After verifying stability and observing zero traffic to the legacy fields, apply a follow-up migration to remove deprecated columns or constraints.

#### Responding to a Failed Migration:
1. Inspect the migration error output from `pnpm prisma:migrate`.
2. Check migration status: `pnpm --filter @darb/api prisma migrate status`.
3. If a migration partially failed (e.g., timed out during index creation), resolve the lock or statement manually in PostgreSQL via `darb_migrator`.
4. Run `prisma migrate resolve --applied <migration_name>` or `--rolled-back <migration_name>` as appropriate based on the verified database state.
