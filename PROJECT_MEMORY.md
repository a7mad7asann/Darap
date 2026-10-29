# DARB — Project Memory

This document serves as the single source of truth for the project state, verified architecture, implementation status, and continuity instructions for AI agents and developers.

---

## A. Project Identity

- **Project Name**: DARB (دَرب)
- **Product Purpose**: Arabic-first educational platform designed for a pilot involving 2–5 teachers and their secondary/middle school students.
- **Core MVP Scope**:
  - Teacher-owned isolated tenant workspaces.
  - Student authentication without mandatory personal email addresses.
  - Course and lesson management with PDF/worksheet attachments.
  - Student enrollment via teacher-generated join codes.
  - Assignments with manual teacher grading.
  - Multiple-choice exams with server-enforced countdown deadlines and automatic grading.
  - Strict tenant isolation enforced at the PostgreSQL database engine level (Row-Level Security).
  - Arabic RTL responsive web interfaces.
- **Technology Stack**:
  - **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide icons, Google Cairo font.
  - **Backend**: NestJS 10, TypeScript, REST API under `/api/v1`, Swagger/OpenAPI, `class-validator`, `cookie-parser`.
  - **Database & ORM**: PostgreSQL 16, Prisma ORM 5.22, version-controlled migrations, PostgreSQL RLS (`SET LOCAL`).
  - **Security**: Argon2id password hashing (`@node-rs/argon2`), HTTP-only `SameSite=Lax` cookies, rate limiting, audit logging.
  - **Tooling & Monorepo**: `pnpm@12` workspaces, Jest, Supertest, ESLint, Prettier, Docker Compose.
- **Current Phase**: Phase 1 — Foundation & Project Setup.
- **Current Status**: **PHASE 1 COMPLETED & VERIFIED**. Ready to transition to Phase 2.

---

## B. Approved Decisions

### Confirmed & Approved
1. **Pilot Scope**: Small pilot with 2–5 teachers and their registered students.
2. **Student Authentication**: Students log in using `username` and password. Personal email addresses are **not mandatory** for students.
3. **Password Recovery**: Admin-assisted password recovery workflow for students with audit logging; no student-email reset flow.
4. **Course Joining**: Students join courses exclusively using teacher-generated join codes supporting expiration, revocation, and optional usage limits.
5. **Multi-Tenancy & Isolation**: Each teacher owns a tenant workspace. All tenant-owned data is strictly isolated using PostgreSQL Row-Level Security (RLS) with transaction-scoped settings (`SET LOCAL app.current_tenant_id`) and an unprivileged application database role (`darb_app`, `NOSUPERUSER NOBYPASSRLS`).
6. **Managed Hosting Readiness**: Applications are designed for managed PostgreSQL (AWS RDS / Neon / Supabase) and S3-compatible managed object storage (AWS S3 / Cloudflare R2).
7. **Explicit Exclusions**: Video streaming, AI features, online payments/subscriptions, gamification, and native mobile apps are strictly **out of scope** for the MVP.

### Assumptions & Pending Approvals
- **Argon2id Memory Cost**: Set to 19 MB per hash. Container memory minimum for API service should be 512 MB.
- **Cookie Domain Scope**: In production, if frontend and backend share the apex domain, `SameSite=Lax` is used; if distinct apex domains, `SameSite=None` with `Secure=true` will be required.

---

## C. Current Implementation State

| Module / Area | Status | Key Files | Implemented Functionality | Missing / Deferred to Later Phases | Tests & Last Result |
|---|---|---|---|---|---|
| **Monorepo & Tooling** | `TESTED` | `package.json`, `pnpm-workspace.yaml`, `.npmrc` | pnpm 12 workspaces (`api`, `web`, `contracts`), unified build, lint, and typecheck scripts. | None for Phase 1. | `pnpm lint`, `pnpm typecheck`, `pnpm build` — ALL PASS |
| **Domain Model & DB Migrations** | `TESTED` | `apps/api/prisma/schema.prisma`, `migration.sql`, `seed.ts` | 22 entities in schema, UUID primary keys, timestamptz(6), soft deletions, initial migration applied, realistic dev seed data (2 teachers, 2 academies, 2 students, admin). | Business workflows for advanced models (lessons, submissions, attempts). | `prisma migrate deploy`, `seed.ts` — SUCCESS |
| **PostgreSQL RLS & Tenant Isolation** | `TESTED` | `apps/api/prisma/migrations/20261029092508_init_darb_mvp/migration.sql`, `prisma.service.ts`, `tenant.guard.ts` | RLS enabled and forced on all tenant-owned tables; `set_tenant_context()` via `SET LOCAL`; unprivileged `darb_app` role; zero connection pool leaking. | Tenant admin settings UI. | `apps/api/test/tenant-rls.e2e-spec.ts` (6 tests) — ALL PASS |
| **Auth & Security** | `TESTED` | `auth.service.ts`, `auth.controller.ts`, `auth.guard.ts`, `login.dto.ts` | Argon2id password hashing, HTTP-only cookie sessions (`darb_session`), student username login, brute-force sliding-window rate limit, 5-attempt account lockout, audit logging (`USER_LOGIN`, `USER_LOGOUT`). | Admin password reset UI, CSRF double-submit token for non-GET browser forms. | `auth.service.spec.ts` (3 tests), `health-and-auth.e2e-spec.ts` (7 tests) — ALL PASS |
| **API Foundation & Health** | `TESTED` | `main.ts`, `health.controller.ts`, `all-exceptions.filter.ts`, `request-id.interceptor.ts` | `/api/v1` base path, correlation IDs, DTO validation pipes, error sanitization, Swagger docs at `/api/docs`, `GET /health/live`, `GET /health/ready`. | Pagination helper middleware for future lists. | `health-and-auth.e2e-spec.ts` — ALL PASS |
| **Frontend RTL Shell** | `TESTED` | `apps/web/src/app/layout.tsx`, `page.tsx`, `login/page.tsx`, `teacher/page.tsx`, `student/page.tsx` | Arabic document metadata (`dir="rtl"`, `lang="ar"`), Cairo typography, UI component library (Button, Input, Card, Form, Loading, EmptyState, ErrorState), login form with demo credentials, route shells. | Course management dashboard, lesson viewer, exam taker screens. | `apps/web/src/app/layout.test.tsx` (2 tests) — ALL PASS |
| **Course & Lesson Management** | `NOT_STARTED` | `apps/api/src/modules/tenants/tenants.service.ts` | Schema entities exist; service scaffolded. | Full CRUD endpoints, lesson ordering, teacher authoring UI. | Deferred to Phase 2 / Phase 3. |
| **Join-Code Engine** | `NOT_STARTED` | `schema.prisma` (`JoinCode`) | Schema entity with codeHash and codeHint exists. | Generation service, SHA-256 hashing, redemption workflow, expiration enforcement. | Deferred to Phase 2. |
| **File Storage & S3** | `NOT_STARTED` | `schema.prisma` (`FileObject`) | Schema entity exists. | S3 client, pre-signed upload URLs, upload confirmation endpoint. | Deferred to Phase 2 / Phase 3. |
| **Assignments & Grading** | `NOT_STARTED` | `schema.prisma` (`Assignment`, `AssignmentSubmission`) | Schema entities exist. | Submission upload, grading service, score calculation. | Deferred to Phase 4. |
| **Exams & Auto-Grading** | `NOT_STARTED` | `schema.prisma` (`Exam`, `ExamQuestion`, `ExamAttempt`) | Schema entities exist. | Server-enforced countdown timer, attempt locking, auto-grading. | Deferred to Phase 5. |

---

## D. Current Position

- **Last Completed Phase**: Phase 1 — Foundation & Project Setup (`COMPLETED`).
- **Current Phase**: Phase 2 — Authentication, Tenancy & Course Scaffolding (`NOT_STARTED` / Ready to start).
- **Last Completed Task**: P1-008 — Monorepo verification, E2E tests, documentation, and baseline commit.
- **Current Task**: Establishing project memory and transition to Phase 2.
- **Next Recommended Task**: `P2-001` — Implement teacher course management endpoints (`POST /api/v1/courses`, `GET /api/v1/courses`) with strict RLS scoping.
- **Blocking Issues**: None.
- **Decisions Requiring Approval**: Staging deployment domain topology for cookie SameSite configuration.

---

## E. Instructions for the Next Agent

1. **Do not repeat Phase 1 setup**: The database migrations, PostgreSQL RLS engine policies, seed data, NestJS core modules, and Next.js RTL shell are already fully functional and tested.
2. **Database Connection**: PostgreSQL runs locally on `localhost:5432` (`darb_dev`). The application user is `darb_app` (`darb_app_secret`). Superuser is `postgres` (`postgres`).
3. **Running the Apps**:
   - Backend API: `pnpm dev:api` (runs on `http://localhost:4000/api/v1`).
   - Frontend Web: `pnpm dev:web` (runs on `http://localhost:3000`).
4. **Running Tests**:
   - `pnpm test` (unit tests and web smoke tests).
   - `pnpm --filter @darb/api test:e2e` (e2e probes and PostgreSQL RLS tests).
5. **Next Step**: Start with Phase 2 tasks in `TASKS.md` (`P2-001`), building course authoring and join-code generation on top of the established `PrismaService.withTenant()` foundation.
