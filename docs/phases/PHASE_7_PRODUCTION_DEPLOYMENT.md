# Phase 7 Report — Production Deployment & Controlled Pilot Launch

- **Phase Objective**: Plan, execute, verify, and operationalize the production cloud deployment of DARB, followed by a controlled onboarding and launch of the 2–5 teacher pilot.
- **Current Phase Status**: `IN_PROGRESS` (P7-001, P7-002 completed; P7-003 through P7-006 planned)
- **Prerequisites**: Phases 1 through 6 (`COMPLETED`), Pilot Readiness Gate Sign-off (`PILOT_READINESS_SIGN_OFF.md`), Commit `7056089`

---

## 1. Executive Summary & Verification of Prior Phase Claims

Phase 6 concluded with commit `7056089`, completing all tasks `P6-001` through `P6-006` with 237 automated tests passing (183 E2E across 10 suites, 54 unit across 8 suites), zero lint errors, zero typecheck errors, and an automated pilot readiness gate runner (`pnpm pilot:verify`).

### Prior Phase Claims Verification Matrix

| Claimed Milestone | Source Document | Current Repository State | Verification Method & Evidence |
|---|---|---|---|
| **Phase 6 Completion** | `PHASE_6_PILOT_READINESS.md` | **VERIFIED** | All 6 tasks marked `TESTED`. Git HEAD is `7056089`. |
| **Pilot Readiness Sign-off** | `PILOT_READINESS_SIGN_OFF.md` | **VERIFIED** | File exists, documents 6 gates, Day 0 sequence, approved status. |
| **CLI Pilot Gate Tool** | `package.json`, `apps/api/scripts/verify-pilot-readiness.ts` | **VERIFIED** | `pnpm pilot:verify` executes and returns `[GATE PASSED]` in ~4s. |
| **Executable E2E Gate Suite** | `apps/api/test/pilot-readiness-gate.e2e-spec.ts` | **VERIFIED** | 13/13 tests pass in 7.05s covering all 6 operational gates. |
| **PostgreSQL RLS Engine Enforcement** | `schema.prisma`, migrations | **VERIFIED** | All 7 tenant tables have `relrowsecurity=true` and `relforcerowsecurity=true` in `pg_class`. |
| **Monorepo Build** | `package.json` | **VERIFIED** | `pnpm build` cleanly compiles `contracts`, `api` (NestJS), and `web` (Next.js 14 SSR). |
| **Test Quality Invariant** | Full Jest suites | **VERIFIED** | **237 / 237 automated tests passing** (183 E2E, 54 unit). |

---

## 2. Production Deployment Readiness Assessment

### 2.1 Application Hosting (@darb/api & @darb/web)
- **Supported Architecture**:
  - Two decoupled services: `@darb/api` (NestJS 10 REST API) and `@darb/web` (Next.js 14 App Router SSR).
  - Packaged via Dockerfiles (`infra/Dockerfile.api`, `infra/Dockerfile.web`) using multi-stage Alpine builds, non-root `USER node`, built-in healthchecks, and root `.dockerignore`.
- **Build & Startup Commands**:
  - Build: `pnpm build` (executes `tsc -b` for contracts, `nest build` for API, `next build` for web).
  - API Start: `node apps/api/dist/main` (or `pnpm --filter @darb/api start:prod`).
  - Web Start: `pnpm --filter @darb/web start` (executes `next start -p 3000`).
- **Port Binding & Health Probes**:
  - API binds to `PORT` (default `4000`). Exposes `/api/v1/health/live`, `/api/v1/health/ready`, `/api/v1/health/dependencies`, `/api/v1/health/metrics`.
  - Web binds to `PORT` (default `3000`). Exposes `/` and Next.js internal routes.
- **Production Startup Validation**:
  - Hardened startup validator `validateEnv` (`apps/api/src/config/env.validation.ts`) executes synchronously before HTTP listening.
  - Rejects missing required variables, insecure session secrets, default development database credentials, and unconfigured HTTPS cookie settings (`COOKIE_SECURE !== true`).

### 2.2 Managed PostgreSQL Tier
- **Compatibility**: Compatible with PostgreSQL 16 on any managed provider (AWS RDS, Neon, Supabase, Azure Flexible Server, DigitalOcean Managed Database).
- **Migration Procedure**:
  - Migrations deployed via `pnpm --filter @darb/api prisma:migrate` (`prisma migrate deploy`).
  - Uses `DATABASE_URL` connecting as `darb_migrator` (DDL schema owner).
  - 8 version-controlled migrations present with transactional atomicity.
- **Dual-Role Separation**:
  - `darb_migrator`: Schema owner, DDL permissions, manages tables and policies.
  - `darb_app`: `NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE`, DML only (`SELECT, INSERT, UPDATE, DELETE` on tables, `USAGE` on sequences).
  - Configured via `APP_DATABASE_URL` for application runtime.
- **Connection Pooling & RLS**:
  - 100% compatible with PgBouncer / Supabase Supavisor in **transaction mode**.
  - RLS uses transaction-scoped `SET LOCAL app.current_tenant_id` inside `$transaction`, which clears automatically on transaction completion.
- **Disaster Recovery & Rollback**:
  - Requires automated daily snapshots (30-day retention) and continuous WAL archiving (7-day PITR).
  - Schema rollback follows the expand-contract pattern; automatic down-migrations are not supported by Prisma. Pre-deployment `pg_dump` backups are required for high-risk migrations.

### 2.3 Managed Object Storage (S3 / Cloudflare R2)
- **Architecture**: Decoupled direct-to-cloud upload pattern. Browsers request SigV4 presigned upload URLs (PUT, 900s TTL) and download URLs (GET, 300s TTL). API verifies object existence via `HeadObject` before registering in PostgreSQL.
- **Configuration Keys**: `STORAGE_PROVIDER` (`'s3'` or `'r2'`), `STORAGE_BUCKET`, `STORAGE_REGION`, `STORAGE_ENDPOINT` (required for R2), `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`.
- **CORS & Access Policy**:
  - Buckets must remain strictly private (Block All Public Access).
  - CORS policy must allow `PUT`, `GET`, `HEAD` methods from `NEXT_PUBLIC_APP_URL` with `Content-Type` and `x-amz-*` headers.
- **Security & Quotas**: 25 MB max file cap, MIME whitelist (PDF, images, DOCX, TXT), tenant-scoped storage key paths (`tenants/${tenantId}/...`).

### 2.4 Security & Privacy Architecture
- **HTTPS & Cookie Transport**: Enforced via `COOKIE_SECURE=true`, `SameSite=Lax` (or `None`), `httpOnly: true`.
- **Session Tokens**: JWT signed with `SESSION_SECRET` (minimum 32 characters, entropy validated against dictionary words).
- **Student Privacy**: Students authenticate using `username` only; personal email addresses are not required or stored.
- **CORS Origin Filtering**: Strips development fallbacks in production; validates strictly against `NEXT_PUBLIC_APP_URL` and `CORS_ALLOWED_ORIGINS`.
- **Rate Limiting**: Sliding-window rate limiter (5 failed attempts per 60 seconds per IP) with temporary account lockout.
- **Admin Provisioning**: Standalone `pnpm db:admin` script uses Argon2id hashing without seeding dummy development fixtures.
- **Sensitive Data Redaction**: Production logs and error responses automatically scrub passwords, tokens, session cookies, database URLs, and S3 signed tokens via `redaction.util.ts`.

### 2.5 Observability & Operational Probes
- **Probes**:
  - Liveness (`/health/live`): Fast vitality check (<10ms), independent of backing dependencies.
  - Readiness (`/health/ready`): Ingress traffic gatekeeper with 3000ms DB query timeout; never leaks credentials.
  - Dependencies (`/health/dependencies`): Non-destructive check of PostgreSQL and S3/R2 storage connectivity.
- **Metrics**: Dual JSON and Prometheus 0.0.4 text format on `/health/metrics` with route template normalization for cardinality protection.
- **Logging**: Single-line JSON emitted to `stdout`/`stderr` with sanitized `X-Request-Id` correlation.
- **Alerting**: 7 production alert definitions documented in `MONITORING_AND_ALERTING_RUNBOOK.md`.

### 2.6 Pilot Operations & Governance
- **Target Population**: 2–5 teachers and ~100–250 students across secondary/middle school courses.
- **Workflows**: Course setup, unit/lesson authoring, join-code redemption, assignments, timed MCQ exams, automatic grading.
- **Suspension Triggers**: Sev 1 cross-tenant data leak, data corruption, or unrecoverable database connectivity failure.

---

## 3. Comprehensive Readiness, Gaps & Blockers Matrix

| Item | Area | Category | Evidence | Risk & Operational Impact | Required Action | Production Blocker? |
|---|---|---|---|---|---|---|
| **Local Host Docker CLI** | Hosting | `PARTIAL` | `docker: command not found` on dev runner | Cannot build Docker images locally on this runner host. | Build images via CI/CD runner or container deployment host. | No (Dockerfiles validated; CI/host handles builds) |
| **Environment Template Sync** | Config | `READY` | `.env.example` harmonized with `STORAGE_*`, `COOKIE_DOMAIN`, and `METRICS_AUTH_TOKEN` | Fully aligned with runtime implementation. | None (Completed in P7-002). | No |
| **Metrics Endpoint Access Gating** | Security | `READY` | `MetricsAuthGuard` in `health.controller.ts` with constant-time Bearer token comparison | Protects operational metrics snapshot and Prometheus formats from unauthorized access when configured. | Documented in `MONITORING_AND_ALERTING_RUNBOOK.md`. | No |
| **Optional Cookie Domain Scoping** | Security | `READY` | `COOKIE_DOMAIN` supported in `env.validation.ts` and `auth.controller.ts` | Allows flexible multi-subdomain cookie sharing while defaulting to host-only cookies when omitted. | Completed in P7-002. | No |
| **Cloud Managed PostgreSQL** | Database | `BLOCKED` | Localhost DB used; no live cloud connection string | Application cannot run in production without a managed database. | User/operator provisions managed PostgreSQL instance (Neon/RDS/Supabase). | **YES (Blocks cloud deployment)** |
| **Production Database Dual Roles** | Database | `PARTIAL` | Script in `MANAGED_POSTGRESQL_RUNBOOK.md § 2.2` | Running as single superuser in production weakens RLS defense-in-depth. | Execute role creation script on cloud database before running migrations. | **YES (Blocks production migration)** |
| **Cloud Managed S3/R2 Bucket** | Storage | `BLOCKED` | Local storage driver used; no cloud bucket provisioned | Student worksheet uploads will fail in multi-container cloud environment without shared storage. | User/operator creates private bucket and IAM user / R2 API token. | **YES (Blocks cloud file uploads)** |
| **Storage Bucket CORS Rule Deployment** | Storage | `PARTIAL` | CORS policy documented in `OBJECT_STORAGE_RUNBOOK.md` | Direct browser uploads will be rejected by browser CORS if not applied to bucket. | Apply documented CORS JSON to S3/R2 bucket upon creation. | **YES (Blocks browser uploads)** |
| **Domain Registration & TLS Certificates** | Ingress | `BLOCKED` | No apex domain or public DNS configured | Users cannot access the platform securely over public HTTPS. | User/operator configures apex domain and DNS A/CNAME records with HTTPS certificates. | **YES (Blocks public access)** |
| **Live Backup / PITR Schedule Verification** | Ops | `PARTIAL` | Documented in runbook; no cloud instance active | Accidental data loss during pilot cannot be restored without PITR. | Confirm automated snapshot policy and PITR window in cloud provider console. | No (Prerequisite for Day 0 launch) |
| **Alert Notification Webhook Integration** | Ops | `PARTIAL` | Runbook defines 7 alerts; no live webhook URL bound | Production alerts trigger internally but do not notify on-call staff via Slack/email. | Wire Prometheus/alert manager to Slack, Discord, or Email webhook. | No (Improves incident response) |

---

## 4. Deployment Architecture Recommendation

### 4.1 Recommended Reference Architecture: Reverse Proxy Path Routing (Option B)

```
                            [ Client Web Browsers ]
                                       │
                                       ▼ (HTTPS:443)
                 ┌───────────────────────────────────────────┐
                 │       Reverse Proxy / Ingress (Caddy/ALB) │
                 │      (Automatic TLS & Security Headers)   │
                 └─────────────┬───────────────┬─────────────┘
                               │               │
       Route: / (Frontend)     │               │ Route: /api/v1 (Backend)
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

#### Why Path Routing is Strongly Recommended for DARB:
1. **Zero Cross-Origin Requests**: Both web and API are served under `https://darb.example.com` (web at `/`, API at `/api/v1`).
2. **Third-Party Cookie Immunity**: `SameSite=Lax` cookies work flawlessly across all browsers (including Safari ITP and mobile Chrome) without third-party cookie restrictions.
3. **Single SSL Certificate & DNS Record**: Only one domain and certificate need to be managed, reducing Day 0 failure points.
4. **Simplified CORS**: CORS allowlists are completely bypassed for same-origin browser fetches.

---

### 4.2 Hosting Provider Evaluation

| Deployment Tier | Provider Options | Technical Fit for DARB | Estimated Monthly Cost | Operational Tradeoffs |
|---|---|---|---|---|
| **Tier 1: Managed Container PaaS (Recommended)** | Railway, Render, Fly.io | High. Native container support, managed PostgreSQL 16, automatic HTTPS, secrets management. | \$15 – \$35 / month | Easiest Day 0 setup for a 2–5 teacher pilot. Minimal DevOps overhead. |
| **Tier 2: Single VPS + Caddy + Managed DB** | Hetzner Cloud / DigitalOcean VPS + Managed DB | High. High performance, complete control, Caddy provides automatic Let's Encrypt TLS. | \$20 – \$40 / month | Requires managing server security updates and Docker Compose lifecycle. |
| **Tier 3: Enterprise Cloud Native** | AWS (ECS Fargate + RDS PostgreSQL + S3) | High. Full enterprise isolation, automated backups, IAM security. | \$85 – \$150 / month | High configuration complexity; overkill for a 2–5 teacher pilot, but great future target. |

**Recommendation for Pilot**: Deploy to **Tier 1 (Railway or Render)** with Cloudflare R2 for object storage (zero egress fees), or a **single secure VPS with Caddy reverse proxy** and managed PostgreSQL.

---

## 5. Phase 7 Proposed Task Breakdown

```
[P7-001: Discovery & Planning] (COMPLETED)
       │
       ▼
[P7-002: Config Harmonization & Ingress Hardening]
       │
       ▼
[P7-003: Cloud Infrastructure Provisioning & Secrets Binding] (Requires External Input)
       │
       ▼
[P7-004: Production Database Role Setup & Migration Execution]
       │
       ▼
[P7-005: Application Deployment & Domain / Ingress Verification]
       │
       ▼
[P7-006: Production Smoke Tests & Controlled Pilot Launch]
```

### Task Specifications

#### P7-001: Production Deployment Discovery & Execution Planning
- **Status**: `COMPLETED`
- **Objective**: Audit completed repository, evaluate deployment readiness across 6 domains, identify gaps/blockers, and produce an authoritative Phase 7 execution roadmap.
- **Deliverables**: `docs/phases/PHASE_7_PRODUCTION_DEPLOYMENT.md`, updated `TASKS.md`, `PROJECT_MEMORY.md`, `CHANGELOG.md`.

#### P7-002: Production Configuration Harmonization & Ingress Hardening
- **Status**: `TESTED`
- **Dependencies**: P7-001
- **Scope**:
  - Harmonized `.env.example` with actual `STORAGE_*` variables (`STORAGE_PROVIDER`, `STORAGE_BUCKET`, `STORAGE_REGION`, `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_FORCE_PATH_STYLE`, `STORAGE_SIGNED_URL_TTL_SECONDS`, `STORAGE_MAX_FILE_SIZE_BYTES`) and removed legacy `S3_*` comments.
  - Implemented optional `COOKIE_DOMAIN` support in `env.validation.ts` and `auth.controller.ts` for session cookies on login and logout, ensuring host-only cookies remain the default when unset.
  - Implemented `MetricsAuthGuard` with `METRICS_AUTH_TOKEN` protecting `GET /api/v1/health/metrics` using constant-time `crypto.timingSafeEqual` comparison on `Authorization: Bearer <token>`, with strict query-parameter rejection and zero token leakage.
  - Updated operational runbooks (`DEPLOYMENT_PLAYBOOK.md` and `MONITORING_AND_ALERTING_RUNBOOK.md`).
  - Unit tests: 36 passed across `env.validation.spec.ts` (26 tests) and `metrics-auth.guard.spec.ts` (10 tests).
  - Dedicated E2E suite: 12 tests passed in `test/phase7-ingress-hardening.e2e-spec.ts`.
- **Acceptance Criteria**: 0 lint/typecheck errors, updated `.env.example`, metrics endpoint gated, all tests passing.

#### P7-003: Managed Cloud Infrastructure Provisioning & Secrets Binding
- **Status**: `BLOCKED` (Requires external credentials & infrastructure decision)
- **Dependencies**: P7-002
- **Scope**:
  - Provision Managed PostgreSQL 16 instance.
  - Provision Managed Object Storage (AWS S3 or Cloudflare R2 bucket) with private access and CORS policy.
  - Register domain and configure DNS records.
  - Securely bind production environment variables (database connection strings, session secrets, storage credentials).
- **Acceptance Criteria**: Cloud database reachable via TLS, storage bucket accessible via API credentials, secrets injected into deployment environment without committing to Git.

#### P7-004: Production Database Role Setup & Migration Execution
- **Status**: `BLOCKED` (Depends on P7-003)
- **Dependencies**: P7-003
- **Scope**:
  - Execute idempotent dual-role provisioning script on the cloud database (`darb_migrator` and `darb_app`).
  - Deploy Prisma migrations using `DATABASE_URL` (`prisma migrate deploy`).
  - Verify forced RLS across all 7 tenant tables in cloud PostgreSQL `pg_class`.
  - Run initial administrator provisioning script (`pnpm db:admin`) to create the root admin account.
- **Acceptance Criteria**: 8 migrations applied, `darb_app` has DML permissions with `NOSUPERUSER NOBYPASSRLS`, root administrator created.

#### P7-005: Application Deployment & Domain / Ingress Verification
- **Status**: `BLOCKED` (Depends on P7-003, P7-004)
- **Dependencies**: P7-003, P7-004
- **Scope**:
  - Deploy `@darb/api` container connected via `APP_DATABASE_URL`.
  - Deploy `@darb/web` container connected to backend API.
  - Verify HTTPS certificate validity and reverse proxy routing.
  - Validate liveness (`/health/live`), readiness (`/health/ready`), and dependency (`/health/dependencies`) probes over HTTPS.
- **Acceptance Criteria**: Both services healthy, probes return HTTP 200 over public HTTPS, zero credential leakage.

#### P7-006: Production Smoke Tests & Controlled Pilot Launch
- **Status**: `BLOCKED` (Depends on P7-005)
- **Dependencies**: P7-005
- **Scope**:
  - Execute automated and manual smoke tests against production endpoints.
  - Test real file upload to S3/R2 and download by student.
  - Admin logs in, creates tenant workspaces for Pilot Teacher 1 and Teacher 2.
  - Teachers create courses and distribute join codes.
  - Students join courses and access curriculum.
  - Sign off on controlled pilot launch.
- **Acceptance Criteria**: End-to-end teacher and student workflows confirmed operational on live production cloud infrastructure.

---

## 6. Distinction Between Local Verification and Real Production Verification

> [!WARNING]
> **Operational Verification Boundary**:
> - **Local Verification (Phase 6)**: Proves that the code, database schema, RLS policies, presigned URL logic, health probes, and test suites are 100% syntactically and logically correct when executed against local PostgreSQL and mock/local storage.
> - **Real Production Verification (Phase 7)**: Requires live cloud infrastructure (managed database, S3/R2 bucket, public domain, HTTPS reverse proxy).
> - Therefore, while Phase 6 proved the software is **ready for deployment**, actual **production readiness** is achieved only after executing P7-003 through P7-006 on live cloud infrastructure.
