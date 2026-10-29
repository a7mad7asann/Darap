# DARB — Tasks & Implementation Progress

This document is the single source of truth for all task statuses across project phases. Checkboxes and explicit status fields must always remain strictly synchronized.

Status values: `NOT_STARTED` | `IN_PROGRESS` | `BLOCKED` | `IMPLEMENTED` | `TESTED`

---

## Phase 1 — Foundation & Project Setup

- [x] **P1-001 — Repository Inspection & Monorepo Initialization**
  - **Status**: `TESTED`
  - **Dependencies**: None
  - **Acceptance**: Clean monorepo with `apps/api`, `apps/web`, `packages/contracts`, unified `pnpm` workspaces, linting, and type checking passing.
  - **File Paths**: `package.json`, `pnpm-workspace.yaml`, `.npmrc`, `.prettierrc`

- [x] **P1-002 — Domain Model Definition & Prisma Schema Scaffolding**
  - **Status**: `TESTED`
  - **Dependencies**: P1-001
  - **Acceptance**: Complete 22-entity MVP domain model defined with UUID keys, `timestamptz(6)`, foreign keys, unique constraints, and soft deletion flags.
  - **File Paths**: `apps/api/prisma/schema.prisma`

- [x] **P1-003 — PostgreSQL Row-Level Security (RLS) Strategy & Initial Migration**
  - **Status**: `TESTED`
  - **Dependencies**: P1-002
  - **Acceptance**: Migration generated and applied; RLS enabled and forced on all tenant-owned tables; unprivileged application role `darb_app` created; `set_tenant_context()` function created.
  - **File Paths**: `apps/api/prisma/migrations/20261029092508_init_darb_mvp/migration.sql`

- [x] **P1-004 — Database Seeding with Multi-Tenant Fixtures**
  - **Status**: `TESTED`
  - **Dependencies**: P1-003
  - **Acceptance**: Seed script populates 2 academies, 2 teachers, 2 students in separate tenants, 1 admin, and 2 courses with Argon2id passwords.
  - **File Paths**: `apps/api/prisma/seed.ts`

- [x] **P1-005 — Authentication Foundation, Cookie Sessions & Security Controls**
  - **Status**: `TESTED`
  - **Dependencies**: P1-004
  - **Acceptance**: Argon2id password verification; HTTP-only SameSite session cookies; username login for students; brute force sliding-window rate limit; 5-attempt account lockout; audit logs.
  - **File Paths**: `apps/api/src/modules/auth/*`, `apps/api/src/common/guards/auth.guard.ts`

- [x] **P1-006 — API Foundation, Health Checks & OpenAPI Documentation**
  - **Status**: `TESTED`
  - **Dependencies**: P1-005
  - **Acceptance**: `/api/v1` base path; correlation IDs via interceptor; error sanitization filter; Swagger at `/api/docs`; `/health/live` and `/health/ready` endpoints.
  - **File Paths**: `apps/api/src/main.ts`, `apps/api/src/modules/health/*`, `apps/api/src/common/*`

- [x] **P1-007 — Arabic RTL Frontend Application Shell & UI Components**
  - **Status**: `TESTED`
  - **Dependencies**: P1-001
  - **Acceptance**: Root layout with `dir="rtl"`, `lang="ar"`, Cairo typography; reusable UI library (Button, Input, Card, Form, Loading, EmptyState, ErrorState); login page; route shells.
  - **File Paths**: `apps/web/src/app/*`, `apps/web/src/components/ui/*`

- [x] **P1-008 — Automated Quality Verification & Persistent Memory Setup**
  - **Status**: `TESTED`
  - **Dependencies**: P1-001 through P1-007
  - **Acceptance**: Unit tests, RLS negative tests, and RTL smoke tests passing; CI workflow configured; persistent memory files (`PROJECT_MEMORY.md`, `CHANGELOG.md`, `TASKS.md`) established.
  - **File Paths**: `apps/api/test/*`, `apps/web/src/app/layout.test.tsx`, `.github/workflows/ci.yml`, `PROJECT_MEMORY.md`

---

## Phase 2 — Course Management, Join Codes & Student Learning

- [x] **P2-001 — Domain Schema & Shared Contracts Extension for Course Lifecycle**
  - **Status**: `TESTED`
  - **Dependencies**: P1-008
  - **Acceptance**: `CourseStatus` enum (`DRAFT`, `PUBLISHED`, `ARCHIVED`) added to Prisma schema and contracts; new reviewed PostgreSQL migration applied; shared contracts updated with DTOs for courses, lessons, join codes, files, and admin provisioning.
  - **File Paths**: `packages/contracts/src/*`, `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/*`

- [x] **P2-002 — Teacher Course Management Endpoints & Ownership Verification**
  - **Status**: `TESTED`
  - **Dependencies**: P2-001
  - **Acceptance**: Endpoints implemented under `/api/v1/teacher/courses` (`GET`, `POST`, `GET /:id`, `PATCH /:id`, `POST /:id/publish`, `POST /:id/archive`); verifies teacher role & tenant ownership under RLS; lists enrolled students.
  - **File Paths**: `apps/api/src/modules/courses/*`

- [x] **P2-003 — Teacher Lesson Management & Reordering**
  - **Status**: `TESTED`
  - **Dependencies**: P2-002
  - **Acceptance**: Endpoints under `/api/v1/teacher` for lesson creation (`POST courses/:courseId/lessons`), editing (`PATCH lessons/:id`), publishing (`POST lessons/:id/publish`), archiving (`POST lessons/:id/archive`), and reordering (`PUT courses/:courseId/lessons/reorder`); ownership verified server-side.
  - **File Paths**: `apps/api/src/modules/lessons/*`

- [x] **P2-004 — High-Entropy Join-Code Engine & Concurrent Atomic Redemption**
  - **Status**: `TESTED`
  - **Dependencies**: P2-002
  - **Acceptance**: Cryptographically secure high-entropy random code generation; display raw code to teacher once; SHA-256 hash stored in DB; never log raw code; supports optional expiration and max uses; atomic redemption with concurrency lock prevents over-use; rate-limited redemption; generic safe errors; duplicate enrollment prevention.
  - **File Paths**: `apps/api/src/modules/join-codes/*`

- [x] **P2-005 — Student Enrollment & Course Viewer Endpoints**
  - **Status**: `TESTED`
  - **Dependencies**: P2-004
  - **Acceptance**: Endpoints for student join (`POST /api/v1/student/join-courses`), enrolled courses (`GET /api/v1/student/courses`), course detail (`GET /api/v1/student/courses/:courseId`), published lessons (`GET /api/v1/student/courses/:courseId/lessons`), lesson completion (`POST /api/v1/student/lessons/:lessonId/progress`); verifies enrollment on every request; students denied draft/archived courses.
  - **File Paths**: `apps/api/src/modules/learning/*`

- [x] **P2-006 — Private File Storage Abstraction & Lesson Attachments**
  - **Status**: `TESTED`
  - **Dependencies**: P2-003
  - **Acceptance**: S3-compatible storage service interface with local dev mockable adapter; presigned upload endpoint (`POST /api/v1/teacher/lessons/:id/files/presign-upload`) validating MIME, extension, size limit (25MB); complete upload endpoint (`POST /api/v1/teacher/lessons/:id/files/complete-upload`); presigned download endpoint (`GET /api/v1/student/files/:id/presign-download`) verifying enrollment; file removal endpoint.
  - **File Paths**: `apps/api/src/modules/files/*`

- [x] **P2-007 — Basic Admin User Provisioning & Password Reset**
  - **Status**: `TESTED`
  - **Dependencies**: P2-001
  - **Acceptance**: Admin endpoints to create teacher accounts & tenant workspaces (`POST /api/v1/admin/teachers`), create student accounts (`POST /api/v1/admin/students`), list users (`GET /api/v1/admin/users`), toggle active status (`PATCH /api/v1/admin/users/:id/status`), and perform audited password reset (`POST /api/v1/admin/users/:id/reset-password`).
  - **File Paths**: `apps/api/src/modules/admin/*`

- [x] **P2-008 — Frontend Arabic RTL Teacher Course & Lesson Views**
  - **Status**: `TESTED`
  - **Dependencies**: P2-002, P2-003, P2-004, P2-006
  - **Acceptance**: RTL pages for course list, course create/edit, lesson authoring, join-code generator/revocation modal, enrolled student roster, and file attachment manager.
  - **File Paths**: `apps/web/src/app/(teacher)/teacher/*`

- [x] **P2-009 — Frontend Arabic RTL Student Course & Learning Views**
  - **Status**: `TESTED`
  - **Dependencies**: P2-005, P2-006
  - **Acceptance**: RTL pages for joining a course by code, enrolled course cards, course detail viewer, lesson reader with PDF/attachment downloads, and lesson completion button with progress bar.
  - **File Paths**: `apps/web/src/app/(student)/student/*`

- [x] **P2-010 — Frontend Arabic RTL Admin Provisioning Views**
  - **Status**: `TESTED`
  - **Dependencies**: P2-007
  - **Acceptance**: RTL admin interface for creating teachers/workspaces, provisioning students, toggling account status, and executing password resets.
  - **File Paths**: `apps/web/src/app/(admin)/admin/*`

- [x] **P2-011 — Comprehensive Automated Security, Concurrency & Regression Tests**
  - **Status**: `TESTED`
  - **Dependencies**: P2-001 through P2-010
  - **Acceptance**: E2E automated test suite verifying cross-tenant course/lesson access denial, join-code concurrency (no over-redemption), rate limiting, enrollment verification on file downloads, student progress isolation, and Phase 1 regression verification.
  - **File Paths**: `apps/api/test/phase2-courses-and-learning.e2e-spec.ts`

---

## Phase 3 — Course Expansion, Worksheets & Rich Content
*(Deferred to Phase 3)*

## Phase 4 — Assignments & Grading
*(Deferred to Phase 4)*

## Phase 5 — Multiple-Choice Exams & Automatic Grading
*(Deferred to Phase 5)*

## Phase 6 — Pilot Readiness & Production Hardening
*(Deferred to Phase 6)*
