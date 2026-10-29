# DARB Changelog

All notable changes to the DARB platform are documented in this file in reverse chronological order.

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
