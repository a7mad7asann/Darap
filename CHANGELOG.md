# DARB Changelog

All notable changes to the DARB platform are documented in this file in reverse chronological order.

---

## 2026-11-01 — Phase 7 — P7-002: Production Config Harmonization & Ingress Hardening

### Summary
- Harmonized production environment configuration documentation, implemented optional `COOKIE_DOMAIN` scoping for multi-subdomain architectures, and added optional `METRICS_AUTH_TOKEN` ingress protection to the operational metrics endpoint.
- **Storage Configuration Harmonization (`.env.example`)**:
  - Replaced legacy `# S3_*` comments with actual supported `STORAGE_*` environment variables matching `env.validation.ts` and `s3-storage.provider.ts`:
    - `STORAGE_PROVIDER` (`local`, `s3`, `r2`)
    - `STORAGE_BUCKET`, `STORAGE_REGION`, `STORAGE_ENDPOINT`
    - `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`
    - `STORAGE_FORCE_PATH_STYLE`, `STORAGE_SIGNED_URL_TTL_SECONDS`, `STORAGE_MAX_FILE_SIZE_BYTES`
  - Clearly documented AWS S3 and Cloudflare R2 production configuration with zero egress fees.
- **Optional `COOKIE_DOMAIN` Support (`auth.controller.ts`, `env.validation.ts`)**:
  - Added optional `COOKIE_DOMAIN` to `EnvironmentVariables` with domain format validation (rejecting protocols, paths, ports, and whitespace).
  - Configures `domain: cookieDomain` on session cookies in `auth.controller.ts` during both `login` and `logout`, ensuring consistent cookie lifecycle.
  - Defaults to host-only cookies when omitted, maintaining zero-leakage behavior for same-origin path-routed deployments.
- **Metrics Endpoint Ingress Protection (`MetricsAuthGuard`, `health.controller.ts`)**:
  - Implemented `MetricsAuthGuard` protecting `GET /api/v1/health/metrics`.
  - When `METRICS_AUTH_TOKEN` is unset, endpoint remains accessible for internal scrapers (ingress protection documented in runbooks).
  - When configured, requires `Authorization: Bearer <METRICS_AUTH_TOKEN>` with constant-time comparison via `crypto.timingSafeEqual`.
  - Strictly rejects query parameter token bypass attempts (`?token=...`).
  - Zero token leakage in error messages or logs (protected by `redaction.util.ts`).
  - Gating applies uniformly to both JSON and Prometheus formats while leaving `/live`, `/ready`, and `/dependencies` probes public.
- **Operational Documentation Updates**:
  - Updated `DEPLOYMENT_PLAYBOOK.md` § 4.1 with `COOKIE_DOMAIN`, `METRICS_AUTH_TOKEN`, and `STORAGE_*` variables.
  - Updated `MONITORING_AND_ALERTING_RUNBOOK.md` § 3 with Prometheus `bearer_token` scraper configuration and ingress filtering rules (Caddy/Nginx).
- **Test Coverage & Verification (260 Total Tests)**:
  - Unit tests for validation and guard: 26 in `env.validation.spec.ts` (7 new), 10 in `metrics-auth.guard.spec.ts` (all new).
  - E2E tests: 12 in `phase7-ingress-hardening.e2e-spec.ts` (all new).
  - Total repository tests: 260 / 260 passed (195 E2E across 11 suites, 65 unit across 9 suites).
  - Clean monorepo build, 0 lint errors, 0 typecheck errors, and `pnpm pilot:verify` passes.

---

## 2026-11-01 — Phase 7 — P7-001: Production Deployment Discovery & Execution Planning

### Summary
- Audited the completed DARB codebase and verified that all Phase 6 deliverables (`P6-001` through `P6-006`) are verified with 237 passing tests (183 E2E across 10 suites, 54 unit across 8 suites) and zero build, lint, or typecheck errors.
- **Production Deployment Readiness Assessment**:
  - Assessed 6 core operational domains: Application Hosting, Managed PostgreSQL, Managed Object Storage, Security Architecture, Observability, and Pilot Operations.
  - Recommended **Option B: Reverse Proxy Path Routing** (`https://darb.example.com` for web, `/api/v1` for API) as the optimal hosting topology, eliminating cross-origin complexity, third-party cookie restrictions, and multiple TLS certificate overhead.
  - Evaluated hosting tiers (Tier 1 Managed PaaS e.g. Railway/Render vs Tier 2 VPS with Caddy vs Tier 3 AWS ECS/RDS/S3).
- **Gaps, Risks & Blockers Analysis**:
  - Classified all operational findings into `READY`, `PARTIAL`, `MISSING`, or `BLOCKED`.
  - Identified external blockers requiring operator action: cloud PostgreSQL provisioning, S3/R2 storage bucket creation, and domain/DNS registration.
  - Identified immediate pre-deployment refinements for P7-002: `.env.example` storage documentation update, optional `COOKIE_DOMAIN` support, and optional `METRICS_AUTH_TOKEN` gating for public ingress.
- **Phase 7 Execution Roadmap**:
  - Authored authoritative Phase 7 deployment plan in `docs/phases/PHASE_7_PRODUCTION_DEPLOYMENT.md`.
  - Established dependency-ordered 6-task breakdown (`P7-001` through `P7-006`).
  - Recorded `P7-001` as `TESTED`. Phase 7 marked `IN_PROGRESS`.

---

## 2026-11-01 — Phase 6 — P6-006: Operational Pilot Readiness Sign-off & Phase 6 Completion

### Summary
- Completed the final operational pilot readiness sign-off for DARB, marking **Phase 6 as fully COMPLETED**.
- **Automated CLI Pilot Readiness Gate (`apps/api/scripts/verify-pilot-readiness.ts`)**:
  - Implemented standalone CLI readiness gate tool executed via `pnpm pilot:verify` (or `pnpm --filter @darb/api pilot:verify`).
  - Directly queries PostgreSQL system catalogs (`pg_class`) to verify forced Row-Level Security (`relrowsecurity = true` AND `relforcerowsecurity = true`) across all 7 tenant tables (`Course`, `Section`, `Lesson`, `Assignment`, `Exam`, `FileObject`, `GradeRecord`).
  - Audits database connectivity, migration state, pilot demographics (2 tenants, 2 teachers, 5 students), root administrator existence (`defaultRole = 'ADMIN'`), active object storage provider (`local`/`s3`/`r2`), and session secret length (>= 32 chars).
  - Emits clear formatted operational checklist: `ALL PILOT READINESS CRITERIA VERIFIED [GATE PASSED]`.
- **Executable Pilot Readiness Gate E2E Test Suite (`apps/api/test/pilot-readiness-gate.e2e-spec.ts`)**:
  - Authored 13 automated end-to-end gate tests asserting all 6 pilot operational dimensions against real NestJS and PostgreSQL instances:
    - *Gate 1*: Production config & startup invariants (`validateEnv` rejects insecure secrets, development DB credentials, and unconfigured HTTPS cookie settings).
    - *Gate 2*: Database security & forced RLS across all 7 tenant tables; strict cross-tenant isolation (404 Not Found on cross-tenant requests).
    - *Gate 3*: Authentication & privacy invariants: student username-only login (no emails required), session cookie persistence on `/auth/me`, secure logout cookie invalidation (`Max-Age=0`).
    - *Gate 4*: Core educational workflows: teacher course creation, curriculum section/lesson authoring, publishing, cryptographic join-code generation with usage limits, and student code redemption.
    - *Gate 5*: Cloud object storage & asset delivery: presigned upload URL issuance, upload ticket verification, 25MB file size limit enforcement, and authorized asset metadata retrieval (`GET /api/v1/files/:fileId/metadata`).
    - *Gate 6*: Observability & health probes: fast uncoupled `/health/live` (<10ms), non-leaking `/health/ready` (3000ms DB timeout), deep backing inspection `/health/dependencies` (non-destructive HeadBucket), dual-format `/health/metrics` (JSON + Prometheus 0.0.4 with route normalization), sanitized `X-Request-Id` correlation, and sensitive data redaction.
  - All 13 tests passed in 7.05s.
- **Authoritative Pilot Readiness Sign-off Document (`docs/operations/PILOT_READINESS_SIGN_OFF.md`)**:
  - Authored comprehensive operational sign-off document detailing the 6 readiness gates, local vs cloud operational boundaries, Day 0 pre-launch deployment sequence, and formal launch determination: **APPROVED — READY FOR PILOT LAUNCH**.
- **Final Repository Metrics**:
  - 237 automated tests passing across the repository (183 E2E across 10 suites, 54 unit across 8 suites).
  - Monorepo clean build passing (`contracts`, `api`, `web`).
  - Zero TypeScript typecheck errors (`pnpm typecheck`).
  - Zero ESLint linting errors or warnings (`pnpm lint`).
  - Phase 6 officially marked `COMPLETED`.

---

## 2026-11-01 — Phase 6 — P6-005: Monitoring, Alerting & Health Probes Hardening

### Summary
- Hardened production observability, three isolated health probes, lightweight in-memory metrics with Prometheus exposition, structured JSON logging with correlation IDs, automated sensitive data redaction, and an operational incident alerting runbook.
- **Three Distinct Health Probes (`HealthModule`)**:
  - `GET /api/v1/health/live`: Ultra-lightweight process vitality check (<10ms). Uncoupled from database or network I/O; returns process uptime, ISO timestamp, and memory usage (`rss`, `heapTotal`, `heapUsed`).
  - `GET /api/v1/health/ready`: Traffic gatekeeper testing PostgreSQL connectivity (`SELECT 1`) with strict 3000ms query timeout via `Promise.race`. Returns HTTP 200 `{"status":"ready","database":"connected","checks":{"database":"up"}}` or HTTP 503 `{"status":"not_ready","database":"disconnected","checks":{"database":"down"}}`. Strictly prevents leaking database credentials, hostnames, or query errors.
  - `GET /api/v1/health/dependencies`: Deep backing infrastructure inspection checking PostgreSQL and S3/R2 storage connectivity. Uses safe non-destructive `HeadBucketCommand` without writing or uploading dummy test files. Returns latency and status for each backing service.
- **Lightweight Operational Metrics (`MetricsService`)**:
  - Implemented in-memory metrics collector in `HealthModule`:
    - Tracks total HTTP requests, status classes (`2xx`, `3xx`, `4xx`, `5xx`), and error counts.
    - Summarizes average and maximum request durations by method and safe route template.
    - Exposes process memory (`rss`, `heapTotal`, `heapUsed`, `external`) and process uptime.
  - Endpoint `GET /api/v1/health/metrics`:
    - JSON format by default in standard DARB response envelope.
    - Standard Prometheus exposition format (version 0.0.4) when requested via `?format=prometheus` or `Accept: text/plain`.
  - Cardinality protection: All route templates are normalized (`/courses/:id/sections`, `/files/:id/metadata`); dynamic UUIDs, upload tickets, and numeric IDs are sanitized to prevent metric store explosion.
- **Structured JSON Logging & Automated Data Redaction**:
  - Implemented `HttpLoggingInterceptor` emitting single-line JSON log records to `stdout`/`stderr` when `NODE_ENV=production`.
  - Sanitized `X-Request-Id` headers against `/^[a-zA-Z0-9_-]{1,64}$/`, falling back to fresh UUIDv4 identifiers if invalid, empty, or malicious.
  - Propagates request ID through HTTP response headers, response envelopes, error envelopes, and structured log records.
  - Automated deep redaction utility (`redaction.util.ts`) scrubbing `Authorization` headers (Bearer/Basic), session cookies (`darb_session`), database passwords, request/response secret fields (`password`, `secretKey`, `token`), and signed S3 URL signatures (`ticket`, `signature`, `X-Amz-Signature`).
- **Operational Runbook (`MONITORING_AND_ALERTING_RUNBOOK.md`)**:
  - Authored authoritative runbook defining 7 core production alert definitions:
    1. `http_5xx_rate_high`: 5xx error rate > 1% over 5m (Sev 1 / Sev 2).
    2. `http_latency_p95_high`: Request latency p95 > 1000ms over 5m (Sev 2).
    3. `database_down`: PostgreSQL readiness probe failure > 30s (Sev 1).
    4. `storage_unhealthy`: S3/R2 storage connectivity or credential failure (Sev 2).
    5. `process_memory_high`: RSS memory > 850 MB for > 10m (Sev 2).
    6. `process_crash_loop`: Container restart count > 3 in 10m (Sev 1).
    7. `readiness_probe_failing`: Ingress readiness failing > 1m (Sev 1).
  - Each alert documents signal, threshold, window, severity, user impact, exact CLI diagnostic commands, remediation steps, and recovery verification.
- **Verification & Automated Test Coverage (224 Tests Total)**:
  - Unit tests for redaction and route normalization (`redaction.util.spec.ts`): 9 / 9 passed.
  - Unit tests for metrics collection & Prometheus formatting (`metrics.service.spec.ts`): 3 / 3 passed.
  - Unit tests for database & storage health checks (`health.service.spec.ts`): 3 / 3 passed.
  - Monitoring and health E2E test suite (`phase6-monitoring.e2e-spec.ts`): 10 / 10 passed.
  - Full repository test suites: 224 / 224 passed (170 E2E, 54 unit).
  - Monorepo build (`pnpm build`): Clean pass across `contracts`, `api`, and `web`.
  - Monorepo lint (`pnpm lint`) and typecheck (`pnpm typecheck`): 0 errors, 0 warnings.
  - P6-006 confirmed as `NOT_STARTED`.

---

## 2026-11-01 — Phase 6 — P6-004: Managed Object Storage (S3/R2 Cloud Integration)

### Summary
- Integrated provider-neutral managed object storage architecture supporting AWS S3, Cloudflare R2, MinIO, and local fallback, preserving strict PostgreSQL Row-Level Security (RLS), multi-tenant isolation, and resource-level authorization.
- **Object Storage Architecture & Drivers**:
  - Installed official AWS SDK v3 dependencies (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`).
  - Implemented `S3StorageProvider` supporting SigV4 presigned upload URLs (PUT, 900s TTL), presigned download URLs (GET, 300s TTL), `HeadObject` existence verification, `HeadObject` metadata retrieval, direct upload/download, and object deletion.
  - Full support for Cloudflare R2 (`endpoint: https://<account_id>.r2.cloudflarestorage.com`, `region: 'auto'`).
  - Enhanced `LocalStorageProvider` with in-memory binary object storage and metadata lookup for local development.
  - Dynamically switches drivers via `STORAGE_PROVIDER` (`'local'`, `'s3'`, `'r2'`) in `FilesModule`.
- **Database Migration & Metadata Model**:
  - Added `storageProvider` column to `FileObject` with migration `20261101115000_add_file_storage_provider`.
  - Backed by forced PostgreSQL Row-Level Security (`fileobject_tenant_isolation`).
- **Security & Authorization Controls**:
  - Added authorized metadata endpoint `GET /api/v1/files/:fileId/metadata` in `FilesController`.
  - Whitelist validation of MIME types (PDF, JPG, PNG, WEBP, DOC, DOCX, TXT) and extensions.
  - 25 MB maximum file size limit server-enforced.
  - Storage key namespace protection (`tenants/${tenantId}/...`) verified upon upload completion.
  - Anti-IDOR checks: Download tokens and metadata access require verified course enrollment & lesson publication, or assignment submission ownership.
- **Environment Validation**:
  - Added storage environment variables (`STORAGE_PROVIDER`, `STORAGE_BUCKET`, `STORAGE_REGION`, `STORAGE_ENDPOINT`, `STORAGE_ACCESS_KEY_ID`, `STORAGE_SECRET_ACCESS_KEY`, `STORAGE_FORCE_PATH_STYLE`, `STORAGE_SIGNED_URL_TTL_SECONDS`, `STORAGE_MAX_FILE_SIZE_BYTES`).
  - Production validation detects and blocks placeholder credentials.
- **Operations & Runbooks**:
  - Authored comprehensive `docs/operations/OBJECT_STORAGE_RUNBOOK.md` detailing AWS S3 and Cloudflare R2 setup, bucket privacy, CORS policies, IAM least-privilege policies, and troubleshooting.
- **Verification**:
  - Real HTTP S3-compatible integration tests (`s3-storage.provider.spec.ts`): 6 / 6 passed.
  - Environment validation unit tests (`env.validation.spec.ts`): 15 / 15 passed.
  - Storage security and tenant-isolation E2E tests (`phase6-object-storage.e2e-spec.ts`): 14 / 14 passed.
  - Full repository test suites: 198 / 198 passed (160 E2E, 38 unit).
  - Clean build, 0 typecheck errors, 0 ESLint warnings.
  - P6-005 and P6-006 confirmed as `NOT_STARTED`.

---

## 2026-11-01 — Phase 6 — P6-003: Production Deployment Playbook & Managed DB Runbook

### Summary
- Authored production deployment playbook and managed PostgreSQL runbook establishing provider-neutral operational procedures, dual-role least-privilege database access, connection pooler sizing, zero-downtime schema evolution, and initial administrator provisioning.
- **Production Deployment Playbook (`docs/operations/DEPLOYMENT_PLAYBOOK.md`)**:
  - Detailed runtime versions and sizing: Node.js 18/20 LTS, pnpm 12, PostgreSQL 16, 1 GB RAM minimum per replica for Argon2id hashing.
  - Specified DNS & HTTPS topologies: Subdomains with shared apex (recommended), single domain reverse proxy path routing, and distinct apex domains with respective cookie flags (`SameSite=Lax` vs `None`).
  - Documented complete environment variable requirements and validation constraints for `@darb/api` and `@darb/web`.
  - Detailed deployment ordering: Database Migration -> API Deployment -> Readiness Probe Verification (`/api/v1/health/ready`) -> Web Frontend Deployment.
  - Provided comprehensive post-deployment smoke tests (liveness, readiness, CORS headers, cookie attributes, invalid login lockout).
  - Outlined rollback strategies distinguishing code rollbacks from database schema evolution; prohibited blind snapshot restores over active writes; documented expand-contract migration patterns.
- **Managed PostgreSQL Runbook (`docs/operations/MANAGED_POSTGRESQL_RUNBOOK.md`)**:
  - Defined dual database role architecture: `darb_migrator` (DDL schema owner, `DATABASE_URL`) vs `darb_app` (DML only, `NOSUPERUSER NOBYPASSRLS`, `APP_DATABASE_URL`).
  - Created idempotent provisioning SQL script for managed PostgreSQL databases.
  - Documented PostgreSQL Row-Level Security (RLS) enforcement verification queries inspecting `pg_tables` and `pg_class` (`FORCE ROW LEVEL SECURITY`).
  - Verified transaction-mode connection pooler compatibility (PgBouncer, Supavisor) with transaction-scoped `SET LOCAL app.current_tenant_id`.
  - Documented port separation: direct connection (port 5432) for Prisma migrations vs transaction pooler (port 6543) for runtime API.
  - Documented database connectivity troubleshooting guide and backup/restore operational boundaries (PITR and automated snapshots).
- **Initial Administrator Provisioning Script**:
  - Created `apps/api/prisma/seed-admin.ts` and registered `pnpm db:admin` (`pnpm --filter @darb/api prisma:admin`).
  - Securely provisions root platform administrator using Argon2id password hashing based on `INITIAL_ADMIN_PASSWORD` (minimum 12 characters) without seeding test data or dummy accounts.
- **Verification**:
  - Prisma schema validated (`prisma validate`).
  - Prisma migration status verified against test database (7 migrations applied, schema up to date).
  - Admin provisioning script tested for success and safe rejection upon missing password.
  - Full automated test suite (171 tests), TypeScript typecheck, and ESLint all 100% passing.
  - P6-004 through P6-006 confirmed as `NOT_STARTED`.

---

## 2026-11-01 — Phase 6 — P6-002: Pilot Workflow Acceptance Suite

### Summary
- Implemented and verified comprehensive automated pilot workflow acceptance suite (`apps/api/test/pilot-workflow-acceptance.e2e-spec.ts`) modeling real multi-tenant educational journeys across 2 teachers and 5 students under PostgreSQL Row-Level Security (RLS).
- **Workflows Automated (43 tests)**:
  - **Workflow 1: Authentication & Session Persistence (5 tests)**:
    - Admin provisions 3 additional students without email addresses (5 total students: Tariq, Sara, Omar, Mona, Zain).
    - All 5 students authenticate using username-only credentials and establish session cookies.
    - Verified session persistence via `/api/v1/auth/me` with multi-tenant context resolution.
    - Verified rejection of forged or expired session tokens with `401 Unauthorized`.
    - Verified logout clears session cookies and prevents subsequent authenticated access.
  - **Workflow 2: Teacher and Course Setup (7 tests)**:
    - Teacher Ahmed creates course "فيزياء 101" (Physics 101) in draft status.
    - Ahmed updates course metadata and grade level.
    - Ahmed creates curriculum sections ("الميكانيكا", "الديناميكا الحرارية").
    - Ahmed creates lessons within sections and updates ordering.
    - Ahmed publishes course, making it available for enrollment.
    - Ahmed generates join codes (Code A: max 3 uses; Code B: single use, revoked).
    - Teacher Layla creates course "كيمياء 101" (Chemistry 101) and generates join code C.
  - **Workflow 3: Student Enrollment & Learning Journey (8 tests)**:
    - Attempting to join with revoked code is rejected with generic error.
    - Students Tariq and Sara join Ahmed's physics course using Code A.
    - Student Omar joins Ahmed's physics course, exhausting Code A (usage 3/3).
    - Code A rejection verified upon exhaustion.
    - Students Mona and Zain join Layla's chemistry course using Code C.
    - Students retrieve course curriculum; draft lessons are omitted from student view.
    - Tariq marks lesson completion; progress percentage accurately updates.
    - Unenrolled students and unauthenticated requests are strictly denied access.
  - **Workflow 4: Assignments & Manual Grading (6 tests)**:
    - Teacher Ahmed authors and publishes an assignment ("واجب قوانين نيوتن") with max score 100.
    - Student Tariq submits assignment solution.
    - Tariq attempting duplicate submission is rejected (enforcing unique constraint).
    - Tariq views submission before grading; score and feedback are masked.
    - Teacher Ahmed grades Tariq's submission (95/100) with Arabic feedback.
    - Grade release policy: Tariq views grade and feedback; atomic `GradeRecord` synced.
    - Student Mona (enrolled in Layla's course) is denied access to Ahmed's assignment.
  - **Workflow 5: Timed MCQ Exams & Auto-Grading (8 tests)**:
    - Teacher Ahmed creates timed MCQ exam with pass score 70 and 2 questions.
    - Student Sara starts exam attempt; backend sets server-side `deadlineAt`.
    - Anti-cheating invariant: `isCorrect` property is stripped from questions and options payload.
    - Sara submits answers incrementally in real time (`saveAnswer`).
    - Exam auto-grading engine calculates score upon submission (100%), sets `status = SUBMITTED`, and updates `GradeRecord`.
    - Attempt locking: answers cannot be modified once submitted.
    - Post-submission review: correct answers and explanations revealed.
    - Hijacking prevention: Student Tariq is denied access to Sara's attempt.
  - **Workflow 6: Course Roster & Teacher Authorization (4 tests)**:
    - Teacher Ahmed queries course student roster (`GET /api/v1/teacher/courses/:courseId/students`) returning 3 enrolled students (Tariq, Sara, Omar).
    - Teacher Layla (cross-tenant) querying Ahmed's roster is denied with `404 Not Found`.
    - Student Tariq attempting to access teacher roster is denied with `403 Forbidden`.
    - Unauthenticated request to roster is denied with `401 Unauthorized`.
  - **Workflow 7: Cross-Tenant Isolation & RLS (5 tests)**:
    - Teacher Layla is denied access to Ahmed's courses (`404 Not Found`).
    - Teacher Layla is denied access to Ahmed's sections.
    - Teacher Layla is denied access to Ahmed's assignments.
    - Teacher Layla is denied access to Ahmed's exams.
    - Teacher Ahmed is denied access to Layla's course.
- **Verification Results**:
  - Full E2E suite: 7 passed, 7 total (146 passed out of 146 tests).
  - Pilot workflow suite: 43 passed out of 43 tests (10.74s).
  - Unit tests: 4 suites passed, 27 total tests passed.
  - Build & Typecheck: Monorepo build 100% clean, 0 TypeScript errors, 0 ESLint warnings.
  - P6-003 through P6-006 confirmed as `NOT_STARTED`.

---

## 2026-10-29 — Phase 6 — P6-001: Production Configuration & Deployment Readiness Audit

### Summary
- Audited and hardened production configuration, environment validation, container security, and deployment readiness across the DARB monorepo.
- **Production Startup Security Invariants (`env.validation.ts`)**:
  - Implemented strict production validation in `validateEnv`:
    - Enforced `COOKIE_SECURE === true` when `NODE_ENV === 'production'`.
    - Prohibited known insecure development placeholder secrets (`change-this`, `super-secret-key`, `placeholder`, etc.) in production.
    - Prohibited default development database credentials (`postgres:postgres@`, `postgres:postgrespassword@`) in production.
  - Added support for `CORS_ALLOWED_ORIGINS` and `ENABLE_SWAGGER` environment variables.
- **Production CORS & Swagger Controls (`main.ts`)**:
  - Eliminated unconditional inclusion of `http://localhost:3000` in production CORS allowed origins list.
  - Dynamically builds trusted origin allowlist from `NEXT_PUBLIC_APP_URL` and `CORS_ALLOWED_ORIGINS`.
  - Configured Swagger / OpenAPI documentation to mount only when enabled (`ENABLE_SWAGGER=true`), defaulting to disabled in production.
- **Secure Cookie Invalidation (`auth.controller.ts`)**:
  - Updated `res.clearCookie` on logout to include `secure` and `sameSite` flags matching original cookie attributes, guaranteeing reliable cookie destruction in HTTPS browsers.
- **Container & Deployment Security**:
  - Created root `.dockerignore` preventing local `.env` secrets, `.git`, `node_modules`, and build artifacts from leaking into Docker build contexts or layers.
  - Hardened `infra/Dockerfile.api` and `infra/Dockerfile.web` with non-root user execution (`USER node`) and built-in container healthchecks.
  - Added healthcheck to API service in `infra/docker-compose.yml` and enforced service readiness dependency for Web (`condition: service_healthy`).
  - Updated `.env.example` with clear sections, production guidelines, and unmistakable placeholders.
- **Automated Verification**:
  - Added 6 unit tests in `apps/api/src/config/env.validation.spec.ts` testing all production security invariants.
  - All 128 tests passing (103 E2E, 25 unit), 0 TypeScript errors, 0 ESLint warnings.
  - Confirmed P6-002 through P6-006 remain `NOT_STARTED`.

---

## 2026-10-29 — Pre-Phase-6 Audit, Bug Fixes & Sessions Verification

### Summary
- Completed comprehensive audit of course management workflows, session mechanisms, and authentication lifecycle.
- **Course Management Bug Fix**:
  - Investigated and resolved `Cannot GET /api/v1/teacher/courses/22222222-2222-2222-2222-222222222222/students`.
  - Root cause: The frontend course details page (`apps/web/src/app/(teacher)/teacher/courses/[courseId]/page.tsx`) requested `apiClient.getCourseStudents(courseId)`, but the route handler `@Get(':courseId/students')` was missing from `TeacherCoursesController`.
  - Fix: Added `@Get(':courseId/students')` route in `TeacherCoursesController` and implemented `getCourseStudents` in `CoursesService` with tenant RLS isolation, teacher ownership enforcement, UUID validation, and Arabic `404 Not Found` response for non-existent courses.
  - Added companion course lesson reordering endpoints (`PUT` and `POST` `/api/v1/teacher/courses/:courseId/lessons/reorder`) in `TeacherCoursesController` and `lessons.service.ts`.
  - Added 6 regression E2E tests in `phase2-courses-and-learning.e2e-spec.ts`.
- **Sessions Forensic Audit**:
  - Delineated "Authentication Sessions" (`darb_session` HTTP-only signed JWT cookie with 24h expiration, `AuthGuard`, `validateSessionToken`) from "Exam Sitting Sessions" (`ExamAttempt` entity tracking server-side `deadlineAt` and attempt progression).
  - Verified that course/classroom live sessions (e.g. video conferencing / WebRTC) are not part of the MVP specification (explicitly out of scope per Phase 1 charter).
  - Clarified architectural distinction between "Sections" (وحدات وفصول دراسية — fully implemented in Phase 3) and "Sessions".
- **Verification Results**:
  - All 103 E2E tests passing (6/6 test suites).
  - All 19 unit tests passing (4/4 test suites).
  - Total 122/122 automated tests passing.
  - Monorepo linting and TypeScript checks pass with 0 warnings and 0 errors.
  - Phase 6 confirmed as `NOT_STARTED` / ON HOLD.

---

## 2026-10-29 — Phase 5 — P5-001 through P5-004: Multiple-Choice Exams & Automatic Grading

### Summary
- Implemented Phase 5: Multiple-Choice Exams & Automatic Grading following the confirmed repository roadmap.
- Enforced PostgreSQL Row-Level Security on all exam entities: `Exam`, `ExamQuestion`, `ExamAttempt`, `AttemptAnswer`, and `GradeRecord`.
- Added new audit actions: `EXAM_CREATED`, `EXAM_UPDATED`, `EXAM_PUBLISHED`, `EXAM_CLOSED`, `EXAM_ATTEMPT_STARTED`, `EXAM_ATTEMPT_SUBMITTED`, `EXAM_AUTO_GRADED` with migration `20261029131000_add_exam_audit_actions`.
- Created comprehensive shared contracts in `packages/contracts/src/exam.ts` for exam authoring, questions, options, student attempts, real-time answer saving, auto-grading results, and reviews.
- Implemented Teacher Exam Authoring & Management (`TeacherExamsController` & `ExamsService`):
  - Create, edit, draft, publish, close, and soft-delete timed exams.
  - Set duration in minutes (1–300), maximum attempts (1–10), and optional passing score threshold.
  - Question management: add, edit, and delete multiple-choice questions with points and options.
  - Validation: requires at least 2 options and exactly 1 correct answer (`isCorrect: true`) per question.
  - Publish verification: requires at least 1 question with valid options and a marked correct answer.
  - View all student attempt results and scores.
  - Review student attempt answers with correct options and awarded points.
- Implemented Student Exam Taking with Server-Enforced Timer (`StudentExamsController` & `ExamsService`):
  - Start attempt: backend validates published status and attempt limit, sets server-side `startedAt` and `deadlineAt`.
  - Security: `isCorrect` property is strictly stripped from all question options returned to students during active attempts.
  - Real-time incremental answer saving: option selections are saved immediately to `AttemptAnswer` (`saveAnswer`).
  - Server-enforced countdown timer: auto-grades and locks attempts expired past deadline.
  - Attempt locking: finished attempts reject answer modifications or re-submission.
  - Multiple attempts support: tracks remaining attempts and updates `GradeRecord` with the highest score achieved.
- Implemented Automatic Grading Engine:
  - Compares each question's selected option against the designated correct option.
  - Sums up earned points vs total points, computes percentage, and checks passing score cutoff (`isPassed`).
  - Atomic synchronization with `GradeRecord` (`itemType = 'EXAM'`), retaining the student's best attempt score.
  - Post-submission review: reveals correct answers, awarded points, and explanations after submission.
- Developed Arabic RTL Frontend Interfaces:
  - Added "الاختبارات الإلكترونية" tab to Teacher Course Detail page (`TeacherExamsTab`) with exam modal, question authoring modal, and submissions view.
  - Added "الاختبارات الإلكترونية" tab to Student Course Learning page (`StudentExamsView`) with exam taking view, sticky countdown timer bar, question pager, instant score card, and review modal.
- Automated E2E Verification:
  - Created `apps/api/test/phase5-exams-and-auto-grading.e2e-spec.ts` with 20 tests covering authoring, RLS isolation, server-side deadline generation, timer locking, auto-grading calculations, and GradeRecord best score synchronization.
  - 100% test pass rate across monorepo: 97/97 E2E tests, 19/19 unit tests, 0 lint warnings, clean builds.

### Files Changed
- `apps/api/prisma/schema.prisma` — Added new `AuditAction` enum values for exams and attempts.
- `apps/api/prisma/migrations/20261029131000_add_exam_audit_actions/migration.sql` — Applied database migration.
- `packages/contracts/src/exam.ts`, `enums.ts`, `index.ts` — Defined exam DTOs and audit actions.
- `apps/api/src/modules/exams/*` — Created `ExamsModule`, `ExamsService`, `TeacherExamsController`, `StudentExamsController`, and DTOs.
- `apps/api/src/app.module.ts` — Registered `ExamsModule`.
- `apps/web/src/lib/api-client.ts` — Added client methods for exams, questions, attempts, real-time answers, and reviews.
- `apps/web/src/components/teacher/teacher-exams-tab.tsx` — Teacher exam and question management UI.
- `apps/web/src/components/student/student-exams-view.tsx` — Student exam taking, timer, auto-grading, and review UI.
- `apps/web/src/app/(teacher)/teacher/courses/[courseId]/page.tsx` — Integrated exams tab for teachers.
- `apps/web/src/app/(student)/student/courses/[courseId]/page.tsx` — Integrated exams tab for students.
- `apps/api/test/phase5-exams-and-auto-grading.e2e-spec.ts` — 20-test automated E2E test suite for Phase 5.
- `docs/phases/PHASE_5_EXAMS.md` — Completed Phase 5 documentation.
- `TASKS.md`, `PROJECT_MEMORY.md`, `CHANGELOG.md` — Updated project memory and task registry.

---

## 2026-10-29 — Phase 4 — P4-001 through P4-004: Assignments & Manual Grading

### Summary
- Implemented Phase 4: Assignments & Manual Grading on top of the DARB MVP monorepo.
- Integrated `Assignment`, `AssignmentSubmission`, `SubmissionAttachment`, and `GradeRecord` with PostgreSQL Row-Level Security (`assignment_tenant_isolation`, `submission_tenant_isolation`, `submissionattachment_tenant_isolation`, `graderecord_tenant_isolation`).
- Added new audit actions: `ASSIGNMENT_CREATED`, `ASSIGNMENT_UPDATED`, `ASSIGNMENT_PUBLISHED`, `ASSIGNMENT_CLOSED`, `SUBMISSION_CREATED`, `SUBMISSION_GRADED` with migration `20261029123000_add_assignment_audit_actions`.
- Created comprehensive shared contracts in `packages/contracts/src/assignment.ts` for assignments, submissions, file attachments, and grading.
- Implemented Teacher Assignment Management:
  - Create assignment with title, description, max score (validated > 0), and optional due date.
  - Life-cycle management: save as `DRAFT`, `PUBLISHED`, and `CLOSED`.
  - Edit draft and published assignments; closed assignments are immutable.
  - View assignment submissions with student name, username, submission status, submitted text, and attachments.
  - Soft-delete assignments (`deletedAt`).
- Implemented Student Assignment Submissions:
  - List published and closed assignments for enrolled courses with deadlines and max scores.
  - Private S3-compatible attachment upload pipeline (`presignSubmissionFileUpload` & `completeSubmissionFileUpload`) validating MIME types, 25MB limit, and key partitioning `tenants/${tenantId}/assignments/${assignmentId}/students/${studentId}/`.
  - Server-enforced unique constraint on `(assignmentId, studentId)` preventing duplicate submissions.
  - Server-side deadline evaluation: submissions created after `dueDate` are automatically marked `status = LATE`.
  - Grade release policy: student score and feedback are strictly masked (`null`) until the submission status is `GRADED`.
- Implemented Teacher Grading & Feedback Engine:
  - Teacher reviews text answers and downloads student attachments via presigned URL with access controls.
  - Validation: score bounds `0 <= score <= maxScore`.
  - Teacher records score and written feedback; submission status transitions to `GRADED` with `graderId` and timestamp recorded.
  - Atomic upsert into `GradeRecord` (`itemType = 'ASSIGNMENT'`) ensuring synchronized course grades without duplicates.
- Strict Security & Access Controls:
  - Cross-tenant isolation: Teacher Layla cannot access or modify Teacher Ahmed's assignments.
  - Unauthorized teacher cannot grade submissions.
  - Cross-student file download forbidden: Student Sara cannot download Student Tariq's submission attachments.
- Built Arabic RTL Frontend:
  - Added "الواجبات والتكليفات" tab to Teacher Course Detail page (`TeacherAssignmentsTab`) with create/edit modal and submissions review/grading drawer.
  - Added assignments tab to Student Course Learning page (`StudentAssignmentsView`) with submission form, file attachment uploader, submission status, and grade card.
- Comprehensive Automated Tests:
  - Created `apps/api/test/phase4-assignments-and-grading.e2e-spec.ts` with 22 tests covering assignment lifecycle, RLS isolation, duplicate prevention, late status detection, grading bounds, atomic `GradeRecord` upsert, and attachment download permissions.
  - 100% test pass rate across monorepo: 77/77 E2E tests, 19/19 unit tests, 0 lint warnings, clean builds.

### Files Changed
- `apps/api/prisma/schema.prisma` — Added new `AuditAction` enum values for assignments and submissions.
- `apps/api/prisma/migrations/20261029123000_add_assignment_audit_actions/migration.sql` — Applied database migration.
- `packages/contracts/src/assignment.ts`, `enums.ts`, `index.ts` — Defined assignment DTOs and audit actions.
- `apps/api/src/modules/files/files.service.ts` — Added `presignSubmissionFileUpload`, `completeSubmissionFileUpload`, and `presignSubmissionAttachmentDownload`.
- `apps/api/src/modules/assignments/*` — Created `AssignmentsModule`, `AssignmentsService`, `TeacherAssignmentsController`, `StudentAssignmentsController`, and DTOs.
- `apps/api/src/app.module.ts` — Registered `AssignmentsModule`.
- `apps/web/src/lib/api-client.ts` — Added client methods for teacher assignments, student submissions, file presigning, and grading.
- `apps/web/src/components/teacher/teacher-assignments-tab.tsx` — Teacher assignment management & grading drawer.
- `apps/web/src/components/student/student-assignments-view.tsx` — Student assignment view, file uploader, and grades card.
- `apps/web/src/app/(teacher)/teacher/courses/[courseId]/page.tsx` — Integrated assignments tab for teachers.
- `apps/web/src/app/(student)/student/courses/[courseId]/page.tsx` — Integrated assignments tab for students.
- `apps/api/test/phase4-assignments-and-grading.e2e-spec.ts` — 22-test automated E2E test suite for Phase 4.
- `docs/phases/PHASE_4_ASSIGNMENTS_AND_GRADING.md` — Completed Phase 4 documentation.
- `TASKS.md`, `PROJECT_MEMORY.md`, `CHANGELOG.md` — Updated project memory and task registry.

---

## 2026-10-29 — Phase 3 — P3-001 through P3-011: Course Expansion, Worksheets & Rich Content

### Summary
- Implemented Phase 3: Course Expansion, Worksheets & Rich Content on top of the DARB MVP monorepo.
- Extended domain model with `Section` entity (units/sections) and `gradeLevel` metadata on `Course`.
- Applied PostgreSQL Row-Level Security migration `20261029112020_add_sections_and_grade_level` with RLS enabled and forced (`section_tenant_isolation`) and audit actions (`SECTION_CREATED`, `SECTION_UPDATED`, `SECTION_DELETED`).
- Built complete Section Management module (`/api/v1/teacher/courses/:id/sections`, `/api/v1/teacher/sections/:id`, reordering) with automatic order indexing and tenant ownership verification.
- Implemented safe section deletion preserving child lessons: deleting a section detaches lessons safely (`sectionId = null`) without data loss.
- Engineered server-side `ContentSanitizer` utility: strips stored/reflected XSS vectors (`<script>`, inline `on*` event handlers, `javascript:` and dangerous URI protocols) from courses, sections, and lessons while preserving Arabic typography, Markdown structures, and valid external links.
- Hardened private file storage upload completion: strictly validates storage key namespace prefix (`tenants/${tenantId}/lessons/${lessonId}/`), verifies allowed MIME types and extensions, and enforces 25MB limits.
- Hardened file download security: strictly denies student downloads for files attached to unpublished/draft lessons (returns 403 Forbidden).
- Implemented Sectioned Curriculum Student Navigation: returns section hierarchy, lesson section titles, and completion state.
- Developed Rich Markdown Editor (`RichEditor`) for teachers with formatting toolbar (Bold, Italic, H1/H2/H3, Lists, Blockquotes, Code, Links) and a Live RTL Preview tab.
- Developed safe client-side Arabic RTL Markdown Renderer (`MarkdownContent`) without `dangerouslySetInnerHTML`.
- Updated Student Learning view (`/student/courses/[courseId]`) with structured unit accordions, rich markdown lesson reader, worksheet download badges with file sizes, and Previous/Next lesson navigation buttons.
- Automated E2E verification: created `phase3-course-expansion.e2e-spec.ts` with 17 tests verifying section CRUD, RLS isolation, XSS sanitization, upload verification, draft file download denial, and section deletion safety. Total passing E2E tests: 55.

### Files Changed
- `apps/api/prisma/schema.prisma` — Added `Section` model, `sectionId` relation on `Lesson`, `gradeLevel` on `Course`, new `AuditAction` enum values.
- `apps/api/prisma/migrations/20261029112020_add_sections_and_grade_level/migration.sql` — Applied migration with RLS policy.
- `packages/contracts/src/section.ts`, `enums.ts`, `course.ts`, `lesson.ts`, `index.ts` — Added section contracts and updated course/lesson DTOs.
- `apps/api/src/common/utils/content-sanitizer.ts`, `content-sanitizer.spec.ts` — Server-side XSS sanitizer with unit test suite.
- `apps/api/src/modules/sections/*` — `SectionsModule`, `SectionsService`, `TeacherSectionsController`, DTOs.
- `apps/api/src/modules/courses/courses.service.ts` — Included `gradeLevel`, sections list, and sanitization.
- `apps/api/src/modules/lessons/lessons.service.ts`, `teacher-lessons.controller.ts` — Added `sectionId`, sanitization, and soft-delete endpoint.
- `apps/api/src/modules/files/files.service.ts` — Hardened upload key prefix validation and unpublished lesson download block.
- `apps/api/src/modules/learning/learning.service.ts`, `student.controller.ts` — Section curriculum grouping, gradeLevel, and presigned download.
- `apps/web/src/lib/api-client.ts` — Added section API methods and lesson deletion.
- `apps/web/src/components/ui/markdown-content.tsx` — Safe Arabic RTL markdown renderer component.
- `apps/web/src/components/ui/rich-editor.tsx` — Rich markdown editor with toolbar and live preview tab.
- `apps/web/src/app/(teacher)/teacher/courses/[courseId]/page.tsx` — Teacher curriculum units, lesson grouping, rich editor, and worksheets.
- `apps/web/src/app/(student)/student/courses/[courseId]/page.tsx` — Student sectioned navigation, reader, worksheets, next/previous buttons.
- `apps/api/test/phase3-course-expansion.e2e-spec.ts` — Automated 17-test Phase 3 E2E test suite.
- `PROJECT_MEMORY.md`, `CHANGELOG.md`, `TASKS.md` — Updated project memory and task ledger.

---

## 2026-10-29 — Phase 2 — P2-001 through P2-011: Course Management, Join Codes, Student Learning & Admin Provisioning

### Summary
- Implemented Phase 2: Course Management, Secure Cryptographic Join Codes, Student Learning, and Admin Provisioning on top of the DARB MVP monorepo.
- Extended domain model with `CourseStatus` enum (`DRAFT`, `PUBLISHED`, `ARCHIVED`) and added new audit actions for courses, lessons, and join codes.
- Added PostgreSQL RLS bypass migration with transaction-scoped `SET LOCAL app.bypass_rls = 'on'` for trusted administrative and cross-tenant join-code operations, strictly preserving zero-leakage tenant isolation.
- Implemented complete Teacher Course and Lesson management (`/api/v1/teacher/courses`, `/api/v1/teacher/lessons`) with ownership verification, publication controls, and lesson reordering.
- Engineered high-entropy cryptographic join-code engine: `DARB-XXXX-XXXX-XXXX` (64-bit entropy), raw code shown only once to authorized teacher, SHA-256 hash stored in DB, atomic interactive transaction with `SELECT ... FOR UPDATE` locking to strictly prevent over-redemption under high concurrency, generic safe error messages, and IP/user sliding-window rate limiting.
- Implemented Student Learning & Enrollment services (`/api/v1/student/join-courses`, `courses`, `lessons`, `progress`) enforcing active enrollment verification on every request.
- Engineered private file storage abstraction (`StorageProvider`, `LocalStorageProvider`) supporting S3-compatible pre-signed upload URLs with MIME/extension/25MB validation, complete upload linking, and pre-signed download URLs verifying student enrollment.
- Implemented Admin Provisioning endpoints (`/api/v1/admin/teachers`, `students`, `users`, `reset-password`) enabling teacher workspace provisioning, student provisioning without mandatory personal email, account status toggles, and audited password resets.
- Built responsive Arabic RTL Next.js pages:
  - Teacher course management (`/teacher`), course detail, lesson editor, file attachment manager, join code generator with prominent one-time raw code banner, and enrolled student roster (`/teacher/courses/[courseId]`).
  - Student dashboard with instant join-code redemption card, enrolled courses list (`/student`), and course learning reader with file downloads and progress completion toggle (`/student/courses/[courseId]`).
  - Admin management dashboard (`/admin`) with user directory, teacher provisioning tab, student provisioning tab, and audited password reset modal.
- Automated E2E verification: created `phase2-courses-and-learning.e2e-spec.ts` testing course lifecycles, cross-tenant denial, cryptographic join codes, atomic concurrency, student progress, file access authorization, and admin provisioning.

### Files Changed
- `apps/api/prisma/schema.prisma` — Added `CourseStatus`, course status column, new `AuditAction` enum values.
- `apps/api/prisma/migrations/20261029095117_add_course_status/migration.sql` — Migration adding `CourseStatus`.
- `apps/api/prisma/migrations/20261029095835_add_audit_actions/migration.sql` — Migration adding audit actions.
- `apps/api/prisma/migrations/20261029100504_rls_bypass_support/migration.sql` — Migration adding `app.bypass_rls` support to all RLS policies.
- `apps/api/src/database/prisma.service.ts` — Added `withBypassRls()` transaction helper.
- `apps/api/src/modules/auth/auth.module.ts` — Marked `@Global()` for universal guard access.
- `apps/api/src/modules/courses/*` — `CoursesService`, `TeacherCoursesController`, DTOs.
- `apps/api/src/modules/lessons/*` — `LessonsService`, `TeacherLessonsController`, DTOs.
- `apps/api/src/modules/join-codes/*` — `JoinCodesService`, `TeacherJoinCodesController`, DTOs.
- `apps/api/src/modules/learning/*` — `LearningService`, `StudentController`, DTOs.
- `apps/api/src/modules/files/*` — `FilesService`, `TeacherFilesController`, `StorageProvider`, `LocalStorageProvider`.
- `apps/api/src/modules/admin/*` — `AdminService`, `AdminController`, DTOs.
- `apps/api/test/phase2-courses-and-learning.e2e-spec.ts` — 25 comprehensive E2E tests covering Phase 2.
- `packages/contracts/src/*` — Added DTOs and types for courses, lessons, join codes, files, and admin.
- `apps/web/src/lib/api-client.ts` — Added Phase 2 typed API endpoints.
- `apps/web/src/components/ui/empty-state.tsx`, `button.tsx` — Extended component flexibility.
- `apps/web/src/app/(teacher)/teacher/page.tsx` — Teacher course management view.
- `apps/web/src/app/(teacher)/teacher/courses/[courseId]/page.tsx` — Course detail, lesson editor, file uploader, join code manager.
- `apps/web/src/app/(student)/student/page.tsx` — Student dashboard and join code redemption.
- `apps/web/src/app/(student)/student/courses/[courseId]/page.tsx` — Student learning viewer, lesson reader, file downloads, progress toggle.
- `apps/web/src/app/(admin)/admin/page.tsx` — Admin management dashboard, provisioning forms, password reset.
- `PROJECT_MEMORY.md`, `CHANGELOG.md`, `TASKS.md` — Updated project memory and task ledger.

### Database / API Changes
- Applied migrations:
  - `20261029095117_add_course_status`
  - `20261029095835_add_audit_actions`
  - `20261029100504_rls_bypass_support`
- Added REST API endpoints under `/api/v1`:
  - `GET/POST /api/v1/teacher/courses`
  - `GET/PATCH /api/v1/teacher/courses/:id`
  - `POST /api/v1/teacher/courses/:id/publish`
  - `POST /api/v1/teacher/courses/:id/archive`
  - `GET /api/v1/teacher/courses/:id/students`
  - `POST /api/v1/teacher/courses/:courseId/lessons`
  - `PATCH /api/v1/teacher/lessons/:id`
  - `POST /api/v1/teacher/lessons/:id/publish`
  - `POST /api/v1/teacher/lessons/:id/archive`
  - `PUT /api/v1/teacher/courses/:courseId/lessons/reorder`
  - `POST /api/v1/teacher/courses/:courseId/join-codes`
  - `GET /api/v1/teacher/courses/:courseId/join-codes`
  - `POST /api/v1/teacher/join-codes/:id/revoke`
  - `POST /api/v1/teacher/lessons/:id/files/presign-upload`
  - `POST /api/v1/teacher/lessons/:id/files/complete-upload`
  - `DELETE /api/v1/teacher/lessons/:id/files/:fileId`
  - `POST /api/v1/student/join-courses`
  - `GET /api/v1/student/courses`
  - `GET /api/v1/student/courses/:courseId`
  - `GET /api/v1/student/courses/:courseId/lessons`
  - `POST /api/v1/student/lessons/:lessonId/progress`
  - `GET /api/v1/student/files/:fileId/presign-download`
  - `POST /api/v1/admin/teachers`
  - `POST /api/v1/admin/students`
  - `GET /api/v1/admin/users`
  - `PATCH /api/v1/admin/users/:id/status`
  - `POST /api/v1/admin/users/:id/reset-password`

### Tests
- Command: `pnpm --filter @darb/api test:e2e`
- Result: PASS (38/38 tests passing across `phase2-courses-and-learning.e2e-spec.ts`, `health-and-auth.e2e-spec.ts`, `tenant-rls.e2e-spec.ts`)
- Command: `pnpm test`
- Result: PASS (16/16 tests passing across `api` and `web`)
- Command: `pnpm --filter @darb/web build`
- Result: PASS (All 8 Next.js pages successfully compiled and generated)
- Command: `pnpm lint && pnpm typecheck`
- Result: PASS (0 ESLint errors, 0 TypeScript errors)

---

## 2026-10-29 — Phase 1 — P1-008: Persistent Project Memory & Documentation Setup

### Summary
- Initialized comprehensive repository-based project memory (`PROJECT_MEMORY.md`, `CHANGELOG.md`, `TASKS.md`).
- Consolidated architecture documentation into `docs/architecture/` (`SYSTEM_OVERVIEW.md`, `DATA_MODEL.md`, `SECURITY_MODEL.md`).
- Formulated phase reports for Phase 1 through Phase 6 in `docs/phases/`.

### Files Changed
- `PROJECT_MEMORY.md` — Primary entry point for AI agents detailing project identity, decisions, implementation state, and position.
- `CHANGELOG.md` — Chronological ledger of engineering changes and test results.
- `TASKS.md` — Single source of truth for work status across Phases 1 through 6.
- `docs/architecture/SYSTEM_OVERVIEW.md` — Architecture overview, boundaries, environment configuration.
- `docs/architecture/DATA_MODEL.md` — Data model, entities, relations, and migration history.
- `docs/architecture/SECURITY_MODEL.md` — Security architecture, Argon2id, RLS, and session cookies.
- `docs/phases/PHASE_1_FOUNDATION.md` — Phase 1 completion report.
- `docs/phases/PHASE_2_AUTH_AND_TENANCY.md` — Phase 2 planning report.
- `docs/phases/PHASE_3_COURSES_AND_LEARNING.md` — Phase 3 planning report.
- `docs/phases/PHASE_4_ASSIGNMENTS_AND_GRADING.md` — Phase 4 planning report.
- `docs/phases/PHASE_5_EXAMS.md` — Phase 5 planning report.
- `docs/phases/PHASE_6_PILOT_READINESS.md` — Phase 6 planning report.

### Database / API Changes
- None (documentation and memory update).

### Tests
- Command: `pnpm lint && pnpm typecheck && pnpm test && pnpm --filter @darb/api test:e2e`
- Result: PASS
- Notes: Monorepo linting, typechecking, 14 unit tests, 13 e2e tests, and 2 frontend smoke tests all pass.

### Risks / Follow-ups
- Ensure memory files are updated immediately upon completion of every Phase 2 task.

---

## 2026-10-29 — Phase 1 — P1-001 through P1-007: Foundation & Project Setup

### Summary
- Implemented Phase 1: Foundation & Project Setup for the DARB educational platform.
- Scaffolded monorepo with NestJS backend, Next.js 14 App Router frontend, and shared contracts.
- Created complete 22-entity Prisma schema and PostgreSQL migration with Row-Level Security (RLS) enforcement.
- Built authentication foundation with Argon2id password hashing, HTTP-only cookie sessions, account lockout, and rate limiting.
- Scaffolded Arabic RTL frontend shell with responsive Tailwind components and Cairo typography.

### Files Changed
- `package.json`, `pnpm-workspace.yaml`, `.npmrc`, `.prettierrc` — Monorepo setup.
- `.env.example`, `.gitignore` — Environment configuration templates.
- `packages/contracts/*` — Shared DTOs, enums, roles, and response envelopes.
- `apps/api/prisma/schema.prisma` — 22-entity domain schema.
- `apps/api/prisma/migrations/20261029092508_init_darb_mvp/migration.sql` — Migration with RLS policies and `set_tenant_context()`.
- `apps/api/prisma/seed.ts` — Seed script with 2 teachers, 2 academies, 2 students, admin, and courses.
- `apps/api/src/config/env.validation.ts` — Class-validator environment variable validation.
- `apps/api/src/database/prisma.service.ts` — Interactive transaction `withTenant()` helper enforcing RLS.
- `apps/api/src/common/*` — RequestIdInterceptor, TransformResponseInterceptor, AllExceptionsFilter, AuthGuard, RolesGuard, TenantGuard.
- `apps/api/src/modules/health/*` — Liveness (`/health/live`) and readiness (`/health/ready`) probes.
- `apps/api/src/modules/auth/*` — Login, logout, and `/me` endpoints with Argon2id verification.
- `apps/api/src/modules/tenants/*` — Scoped tenant course query service.
- `apps/api/test/*` — Unit and E2E test suites (including negative cross-tenant RLS tests).
- `apps/web/src/app/*` — Root layout with `dir="rtl"`, `lang="ar"`, landing page, login page, and dashboard shells.
- `apps/web/src/components/ui/*` — Reusable components (Button, Input, Card, Form, Loading, EmptyState, ErrorState).
- `apps/web/src/lib/api-client.ts` — Typed HTTP client with cookie credentials.
- `infra/docker-compose.yml`, `infra/init-db.sql`, `infra/Dockerfile.*` — Containerized infrastructure.
- `.github/workflows/ci.yml` — Automated CI testing workflow.

### Database / API Changes
- Applied PostgreSQL migration `20261029092508_init_darb_mvp`.
- Created database role `darb_app` (`NOSUPERUSER NOBYPASSRLS`).
- Configured RLS with `FORCE ROW LEVEL SECURITY` on `Course`, `Lesson`, `Assignment`, `Exam`, `FileObject`, etc.
- Exposed REST API endpoints under `/api/v1`:
  - `GET /api/v1/health/live`
  - `GET /api/v1/health/ready`
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/logout`
  - `GET /api/v1/auth/me`
- Swagger documentation accessible at `/api/docs`.

### Tests
- Command: `pnpm --filter @darb/api test`
- Result: PASS (14 tests)
- Command: `pnpm --filter @darb/api test:e2e`
- Result: PASS (13 tests, including 6 RLS and cross-tenant isolation tests)
- Command: `pnpm --filter @darb/web test`
- Result: PASS (2 tests)
- Command: `pnpm build`
- Result: PASS (Contracts, API, and Next.js static pages all built cleanly)

### Risks / Follow-ups
- Rate limiting is in-memory for the single-instance pilot; will need shared store for horizontal scaling.
- Student password recovery is admin-assisted; out-of-band verification procedure must be documented for pilot school admins.
