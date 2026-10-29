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
  - Assignments with manual teacher grading (Phase 4).
  - Multiple-choice exams with server-enforced countdown deadlines and automatic grading (Phase 5).
  - Strict tenant isolation enforced at the PostgreSQL database engine level (Row-Level Security).
  - Arabic RTL responsive web interfaces.
- **Technology Stack**:
  - **Frontend**: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Lucide icons, Google Cairo font.
  - **Backend**: NestJS 10, TypeScript, REST API under `/api/v1`, Swagger/OpenAPI, `class-validator`, `cookie-parser`.
  - **Database & ORM**: PostgreSQL 16, Prisma ORM 5.22, version-controlled migrations, PostgreSQL RLS (`SET LOCAL app.current_tenant_id` and `SET LOCAL app.bypass_rls`).
  - **Security**: Argon2id password hashing (`@node-rs/argon2`), HTTP-only `SameSite=Lax` cookies, rate limiting, audit logging.
  - **Tooling & Monorepo**: `pnpm@12` workspaces, Jest, Supertest, ESLint, Prettier, Docker Compose.
- **Current Phase**: Phase 2 — Course Management, Join Codes & Student Learning.
- **Current Status**: **PHASE 2 COMPLETED & VERIFIED**. Ready to transition to Phase 3.

---

## B. Approved Decisions

### Confirmed & Approved
1. **Pilot Scope**: Small pilot with 2–5 teachers and their registered students.
2. **Student Authentication**: Students log in using `username` and password. Personal email addresses are **not mandatory** for students.
3. **Password Recovery**: Admin-assisted password recovery workflow for students with audit logging; no student-email reset flow.
4. **Course Joining**: Students join courses exclusively using teacher-generated join codes supporting expiration, revocation, and optional usage limits.
5. **Multi-Tenancy & Isolation**: Each teacher owns a tenant workspace. All tenant-owned data is strictly isolated using PostgreSQL Row-Level Security (RLS) with transaction-scoped settings (`SET LOCAL app.current_tenant_id`) and an unprivileged application database role (`darb_app`, `NOSUPERUSER NOBYPASSRLS`). Trusted administrative and global operations (such as cross-tenant join-code redemption) utilize a transaction-scoped `SET LOCAL app.bypass_rls = 'on'` block.
6. **Managed Hosting Readiness**: Applications are designed for managed PostgreSQL (AWS RDS / Neon / Supabase) and S3-compatible managed object storage (AWS S3 / Cloudflare R2).
7. **Explicit Exclusions**: Video streaming, AI features, online payments/subscriptions, gamification, and native mobile apps are strictly **out of scope** for the MVP.

### Assumptions & Pending Approvals
- **Argon2id Memory Cost**: Set to 19 MB per hash. Container memory minimum for API service should be 512 MB.
- **Cookie Domain Scope**: In production, if frontend and backend share the apex domain, `SameSite=Lax` is used; if distinct apex domains, `SameSite=None` with `Secure=true` will be required.

---

## C. Current Implementation State

| Module / Area | Status | Key Files | Implemented Functionality | Missing / Deferred to Later Phases | Tests & Last Result |
|---|---|---|---|---|---|
| **Monorepo & Tooling** | `TESTED` | `package.json`, `pnpm-workspace.yaml`, `.npmrc` | pnpm 12 workspaces (`api`, `web`, `contracts`), unified build, lint, and typecheck scripts. | None. | `pnpm lint`, `pnpm typecheck`, `pnpm build` — ALL PASS |
| **Domain Model & DB Migrations** | `TESTED` | `apps/api/prisma/schema.prisma`, `migration.sql`, `seed.ts` | Complete domain model in schema, UUID primary keys, timestamptz(6), soft deletions, CourseStatus enum, audit actions, applied migrations (`20261029095117_add_course_status`, `20261029095835_add_audit_actions`, `20261029100504_rls_bypass_support`), realistic multi-tenant seed data. | Assignments & Exams domain logic (deferred). | `prisma migrate deploy`, `seed.ts` — SUCCESS |
| **PostgreSQL RLS & Tenant Isolation** | `TESTED` | `apps/api/prisma/migrations/*`, `prisma.service.ts`, `tenant.guard.ts` | RLS enabled and forced on all tenant-owned tables; `set_tenant_context()` via `SET LOCAL`; `withBypassRls()` via `SET LOCAL app.bypass_rls = 'on'`; unprivileged `darb_app` role; zero connection pool leaking. | None. | `apps/api/test/tenant-rls.e2e-spec.ts` (6 tests) — ALL PASS |
| **Auth & Security** | `TESTED` | `auth.service.ts`, `auth.controller.ts`, `auth.guard.ts`, `roles.guard.ts` | Argon2id password hashing, HTTP-only cookie sessions (`darb_session`), student username login, brute-force sliding-window rate limit, 5-attempt account lockout, audit logging (`USER_LOGIN`, `USER_LOGOUT`). | None. | `auth.service.spec.ts` (3 tests), `health-and-auth.e2e-spec.ts` (7 tests) — ALL PASS |
| **Teacher Course Management** | `TESTED` | `apps/api/src/modules/courses/*`, `apps/web/src/app/(teacher)/teacher/*` | Course list, course creation, draft/published/archived lifecycle, course details, enrolled student roster, cross-tenant isolation enforcement. | None. | `phase2-courses-and-learning.e2e-spec.ts` — PASS |
| **Teacher Lesson Management** | `TESTED` | `apps/api/src/modules/lessons/*` | Lesson creation, text content, ordering, publication toggle, archive toggle, reordering endpoint, teacher ownership checks. | Rich text / markdown editor. | `phase2-courses-and-learning.e2e-spec.ts` — PASS |
| **Cryptographic Join-Code Engine** | `TESTED` | `apps/api/src/modules/join-codes/*` | High-entropy crypto code generator (`DARB-XXXX-XXXX-XXXX`), SHA-256 hash stored in DB, raw code displayed once, never logged in plaintext, optional maxUses and expiration, atomic row lock (`FOR UPDATE`) preventing concurrent over-use, generic safe rejection messages, rate limiting. | QR code image generation (optional). | `phase2-courses-and-learning.e2e-spec.ts` (concurrency & isolation tests) — PASS |
| **Student Learning & Progress** | `TESTED` | `apps/api/src/modules/learning/*`, `apps/web/src/app/(student)/student/*` | Code redemption, enrolled courses list, course learning view with published lessons, lesson reader, progress completion toggle and calculation. | Quizzes (deferred to Phase 5). | `phase2-courses-and-learning.e2e-spec.ts` — PASS |
| **File Storage & Lesson Attachments** | `TESTED` | `apps/api/src/modules/files/*` | S3-compatible storage abstraction with LocalStorageProvider fallback, presigned upload URLs (MIME, ext, 25MB validation), upload completion, presigned download URLs with enrollment verification, file deletion. | AWS S3 production credentials config. | `phase2-courses-and-learning.e2e-spec.ts` — PASS |
| **Admin Provisioning & Recovery** | `TESTED` | `apps/api/src/modules/admin/*`, `apps/web/src/app/(admin)/admin/*` | Provision teacher + workspace with slug, provision student without email, user list with pagination, user status toggle, audited password reset. | CSV bulk import. | `phase2-courses-and-learning.e2e-spec.ts` — PASS |
| **Frontend Arabic RTL Application** | `TESTED` | `apps/web/src/app/*`, `apps/web/src/components/ui/*` | Cairo font, full RTL (`dir="rtl"`), responsive dashboards for Teacher, Student, and Admin, Course management, Lesson viewer, Join-code redemption, and one-time display banners. | None. | `layout.test.tsx`, `next build` (all 8 static/dynamic routes) — ALL PASS |
| **Assignments & Grading** | `NOT_STARTED` | `schema.prisma` (`Assignment`, `AssignmentSubmission`) | Schema entities exist. | Submission upload, grading service, score calculation. | Deferred to Phase 4. |
| **Exams & Auto-Grading** | `NOT_STARTED` | `schema.prisma` (`Exam`, `ExamQuestion`, `ExamAttempt`) | Schema entities exist. | Server-enforced countdown timer, attempt locking, auto-grading. | Deferred to Phase 5. |

---

## D. Current Position

- **Last Completed Phase**: Phase 2 — Course Management, Join Codes & Student Learning (`COMPLETED`).
- **Current Phase**: Phase 2 (`COMPLETED`). Ready to start Phase 3.
- **Last Completed Task**: P2-011 — Comprehensive Automated Security, Concurrency & Regression Tests.
- **Current Task**: Completed Phase 2 implementation, tests, and documentation.
- **Next Recommended Task**: Phase 3 planning and kickoff (Course Expansion, Worksheets & Rich Content).
- **Blocking Issues**: None.
- **Decisions Requiring Approval**: S3 production bucket provider selection (AWS S3 vs Cloudflare R2).

---

## E. Instructions for the Next Agent

1. **Phase 2 is fully implemented and tested**: All courses, lessons, cryptographic join codes, file presigned upload/download abstractions, student learning views, admin provisioning, and RLS policies are verified and passing 100% of tests.
2. **Database Context**:
   - PostgreSQL 16 running on `localhost:5432/darb_dev`.
   - Superuser: `postgres:postgres`. Application user: `darb_app:darb_app_secret`.
   - All migrations applied (`init_darb_mvp`, `add_course_status`, `add_audit_actions`, `rls_bypass_support`).
3. **Execution Commands**:
   - Backend API: `pnpm dev:api` (port 4000)
   - Frontend Web: `pnpm dev:web` (port 3000)
   - E2E Tests: `pnpm --filter @darb/api test:e2e` (38 tests)
   - Unit Tests: `pnpm test` (16 tests)
   - Lint & Typecheck: `pnpm lint && pnpm typecheck`
4. **Next Phase**: Move forward to Phase 3 or subsequent phases as requested by the user.
