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
- **Current Phase**: Phase 4 — Assignments & Grading.
- **Current Status**: **PHASE 4 COMPLETED & VERIFIED**. Ready to transition to Phase 5 (Multiple-Choice Exams & Automatic Grading).

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
| **Teacher Course Management** | `TESTED` | `apps/api/src/modules/courses/*`, `apps/web/src/app/(teacher)/teacher/*` | Course list, course creation, draft/published/archived lifecycle, course details, enrolled student roster, cross-tenant isolation enforcement, grade level metadata (`gradeLevel`). | None. | `phase2-courses-and-learning.e2e-spec.ts`, `phase3-course-expansion.e2e-spec.ts` — PASS |
| **Sections & Curriculum Organization** | `TESTED` | `apps/api/src/modules/sections/*`, `packages/contracts/src/section.ts`, `schema.prisma` | Section model, PostgreSQL RLS (`section_tenant_isolation`), CRUD endpoints under `/api/v1/teacher`, automatic order indexing, reordering, cross-tenant access denial, safe deletion detaching lessons without data loss. | None. | `phase3-course-expansion.e2e-spec.ts` — PASS |
| **Teacher Lesson Management & Rich Editor** | `TESTED` | `apps/api/src/modules/lessons/*`, `apps/web/src/components/ui/rich-editor.tsx` | Lesson creation, section assignment, server-side content sanitization (`ContentSanitizer`), soft-delete, reordering, rich markdown editor with formatting toolbar and live RTL preview tab. | None. | `phase2-courses-and-learning.e2e-spec.ts`, `phase3-course-expansion.e2e-spec.ts` — PASS |
| **Cryptographic Join-Code Engine** | `TESTED` | `apps/api/src/modules/join-codes/*` | High-entropy crypto code generator (`DARB-XXXX-XXXX-XXXX`), SHA-256 hash stored in DB, raw code displayed once, never logged in plaintext, optional maxUses and expiration, atomic row lock (`FOR UPDATE`) preventing concurrent over-use, generic safe rejection messages, rate limiting. | QR code image generation (optional). | `phase2-courses-and-learning.e2e-spec.ts` (concurrency & isolation tests) — PASS |
| **Student Learning & Section Navigation** | `TESTED` | `apps/api/src/modules/learning/*`, `apps/web/src/app/(student)/student/*` | Code redemption, enrolled courses list, sectioned curriculum sidebar with collapsible units, lesson reader with safe Arabic markdown, previous/next lesson navigation, progress completion toggle and calculation. | Quizzes (deferred to Phase 5). | `phase2-courses-and-learning.e2e-spec.ts`, `phase3-course-expansion.e2e-spec.ts` — PASS |
| **File Storage, Worksheets & Security Hardening** | `TESTED` | `apps/api/src/modules/files/*`, `apps/web/src/components/ui/markdown-content.tsx` | S3 storage abstraction, strict storageKey prefix verification (`tenants/${tenantId}/lessons/${lessonId}/`), MIME & 25MB validation, strict download denial on unpublished lessons (403 Forbidden), worksheet download badges. | AWS S3 production credentials config. | `phase2-courses-and-learning.e2e-spec.ts`, `phase3-course-expansion.e2e-spec.ts` — PASS |
| **Admin Provisioning & Recovery** | `TESTED` | `apps/api/src/modules/admin/*`, `apps/web/src/app/(admin)/admin/*` | Provision teacher + workspace with slug, provision student without email, user list with pagination, user status toggle, audited password reset. | CSV bulk import. | `phase2-courses-and-learning.e2e-spec.ts` — PASS |
| **Frontend Arabic RTL Application** | `TESTED` | `apps/web/src/app/*`, `apps/web/src/components/ui/*` | Cairo font, full RTL (`dir="rtl"`), responsive dashboards for Teacher, Student, and Admin, structured course curriculum manager, live markdown preview, section accordions, and lesson reader. | None. | `layout.test.tsx`, `next build` (all 8 static/dynamic routes) — ALL PASS |
| **Assignments & Grading** | `TESTED` | `apps/api/src/modules/assignments/*`, `teacher-assignments-tab.tsx`, `student-assignments-view.tsx` | Assignment creation, draft/published/closed lifecycle, due dates, text and attachment submissions, 25MB limits, unique student constraint, server-side late detection, manual teacher grading, atomic `GradeRecord` sync, grade release policy. | None. | `phase4-assignments-and-grading.e2e-spec.ts` (22 tests) — ALL PASS |
| **Exams & Auto-Grading** | `NOT_STARTED` | `schema.prisma` (`Exam`, `ExamQuestion`, `ExamAttempt`) | Schema entities exist. | Server-enforced countdown timer, attempt locking, auto-grading. | Deferred to Phase 5. |

---

## D. Current Position

- **Last Completed Phase**: Phase 4 — Assignments & Grading (`COMPLETED`).
- **Current Phase**: Phase 4 (`COMPLETED`). Ready to start Phase 5 (Multiple-Choice Exams & Automatic Grading).
- **Last Completed Task**: P4-004 — Comprehensive Automated Security, Concurrency & Regression Tests.
- **Current Task**: Completed Phase 4 implementation, tests, and documentation.
- **Next Recommended Task**: Phase 5 kickoff (Multiple-Choice Exams & Automatic Grading).
- **Blocking Issues**: None.
- **Decisions Requiring Approval**: None.

---

## E. Instructions for the Next Agent

1. **Phase 4 is fully implemented and tested**:
   - `Assignment`, `AssignmentSubmission`, `SubmissionAttachment`, `GradeRecord` integrated with PostgreSQL RLS.
   - New audit actions added (`ASSIGNMENT_CREATED`, `ASSIGNMENT_UPDATED`, `ASSIGNMENT_PUBLISHED`, `ASSIGNMENT_CLOSED`, `SUBMISSION_CREATED`, `SUBMISSION_GRADED`) via migration `20261029123000_add_assignment_audit_actions`.
   - Complete assignment lifecycle: draft -> published -> closed.
   - Server-side deadline check flags submissions past due date as `status = LATE`.
   - Server-enforced unique constraint on `(assignmentId, studentId)` safely rejects duplicate submissions.
   - File attachment uploader (PDF/DOCX/images, 25MB, validated namespacing `tenants/{tenantId}/assignments/{assignmentId}/students/{studentId}/`).
   - Private attachment download authorization (only the submitting student, course teacher, or admin can presign download URLs).
   - Atomic upsert into `GradeRecord` synchronized on submission grading.
   - Grade release policy: students see grades and feedback only when status is `GRADED`.
   - Arabic RTL UI for teachers (`TeacherAssignmentsTab`) and students (`StudentAssignmentsView`).
   - 100% of test suites passing: 19 unit tests, 77 E2E tests (including 22 Phase 4 E2E tests), zero lint errors, clean build.
2. **Database Context**:
   - PostgreSQL 16 running on `localhost:5432/darb_dev`.
   - Superuser: `postgres:postgres`. Application user: `darb_app:darb_app_secret`.
   - Applied migrations: `init_darb_mvp`, `add_course_status`, `add_audit_actions`, `rls_bypass_support`, `add_sections_and_grade_level`, `add_assignment_audit_actions`.
3. **Execution Commands**:
   - Backend API: `pnpm dev:api` (port 4000)
   - Frontend Web: `pnpm dev:web` (port 3000)
   - E2E Tests: `pnpm --filter @darb/api test:e2e` (77 tests)
   - Unit Tests: `pnpm test` (19 tests)
   - Monorepo Build: `pnpm build`
4. **Next Phase**: Phase 5 — Multiple-Choice Exams & Automatic Grading (`Exam`, `ExamQuestion`, `ExamOption`, `ExamAttempt`, `ExamAnswer`, server-side timer enforcement, auto-grading engine, attempt locking).
