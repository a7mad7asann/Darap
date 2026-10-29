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

- [x] **P3-001 — Course Metadata & Grade Level Enhancement**
  - **Status**: `TESTED`
  - **Dependencies**: P2-011
  - **Acceptance**: Added `gradeLevel` to `Course` model, contracts DTOs, API validation, and UI filters/badges.
  - **File Paths**: `apps/api/prisma/schema.prisma`, `packages/contracts/src/course.ts`, `apps/api/src/modules/courses/*`

- [x] **P3-002 — Section Domain Entity, Prisma Migration & PostgreSQL RLS Isolation**
  - **Status**: `TESTED`
  - **Dependencies**: P3-001
  - **Acceptance**: `Section` entity added with foreign keys to Tenant and Course; PostgreSQL RLS enabled and forced (`section_tenant_isolation`); database migration `20261029112020_add_sections_and_grade_level` applied cleanly.
  - **File Paths**: `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/20261029112020_add_sections_and_grade_level/*`

- [x] **P3-003 — Backend Sections Module, CRUD & Reordering Endpoints**
  - **Status**: `TESTED`
  - **Dependencies**: P3-002
  - **Acceptance**: Full section lifecycle endpoints under `/api/v1/teacher` (`POST courses/:id/sections`, `GET courses/:id/sections`, `PATCH sections/:id`, `DELETE sections/:id`, `POST courses/:id/sections/reorder`); strictly scoped by tenant RLS and verified teacher course ownership.
  - **File Paths**: `apps/api/src/modules/sections/*`, `packages/contracts/src/section.ts`

- [x] **P3-004 — Server-Side Content Sanitization & Stored XSS Neutralization**
  - **Status**: `TESTED`
  - **Dependencies**: P3-003
  - **Acceptance**: Dedicated `ContentSanitizer` service stripping scripts, embeds, `on*` event handlers, and `javascript:` URIs from course, section, and lesson titles/contents while safely preserving Arabic text, markdown syntax, and valid links.
  - **File Paths**: `apps/api/src/common/utils/content-sanitizer.ts`, `apps/api/src/common/utils/content-sanitizer.spec.ts`

- [x] **P3-005 — Hardened Object Storage Namespace Verification & Attachment Integrity**
  - **Status**: `TESTED`
  - **Dependencies**: P2-006
  - **Acceptance**: Upload completion validates storage key namespace prefix (`tenants/${tenantId}/lessons/${lessonId}/`), verifies allowed MIME types and file extensions, checks 25MB limits, and ensures existence in private storage.
  - **File Paths**: `apps/api/src/modules/files/files.service.ts`

- [x] **P3-006 — Strict Download Authorization & Unpublished Lesson Denial**
  - **Status**: `TESTED`
  - **Dependencies**: P3-005
  - **Acceptance**: Enforces that students can only download files if enrolled, the course is published, and the lesson itself is published and not deleted (`isPublished === true`). Draft lesson files are strictly denied with 403 Forbidden.
  - **File Paths**: `apps/api/src/modules/files/files.service.ts`

- [x] **P3-007 — Safe Section Deletion & Child Lesson Preservation**
  - **Status**: `TESTED`
  - **Dependencies**: P3-003
  - **Acceptance**: Deleting a section soft-deletes the section entity and safely detaches child lessons by setting `sectionId = null`, preventing orphan records or accidental content loss.
  - **File Paths**: `apps/api/src/modules/sections/sections.service.ts`

- [x] **P3-008 — Student Learning Navigation by Sections & Progress Tracking**
  - **Status**: `TESTED`
  - **Dependencies**: P3-003, P3-006
  - **Acceptance**: Student learning endpoints return section hierarchy, lesson section titles, and lesson completion status; next/previous lesson transitions verified.
  - **File Paths**: `apps/api/src/modules/learning/learning.service.ts`, `apps/api/src/modules/learning/student.controller.ts`

- [x] **P3-009 — Teacher RTL Structured Course & Markdown Live Preview UI**
  - **Status**: `TESTED`
  - **Dependencies**: P3-003, P3-004
  - **Acceptance**: Teacher course page displays curriculum units, unsectioned lessons, section modals, lesson assignment to sections, formatting toolbar, and live Arabic RTL preview.
  - **File Paths**: `apps/web/src/app/(teacher)/teacher/courses/[courseId]/page.tsx`, `apps/web/src/components/ui/rich-editor.tsx`

- [x] **P3-010 — Student RTL Sectioned Curriculum & Markdown Reader UI**
  - **Status**: `TESTED`
  - **Dependencies**: P3-008
  - **Acceptance**: Student learning interface features structured unit accordions, safe client-side markdown rendering, worksheet downloads with size badges, and lesson navigation controls.
  - **File Paths**: `apps/web/src/app/(student)/student/courses/[courseId]/page.tsx`, `apps/web/src/components/ui/markdown-content.tsx`

- [x] **P3-011 — Comprehensive Automated Security, Concurrency & Regression Tests**
  - **Status**: `TESTED`
  - **Dependencies**: P3-001 through P3-010
  - **Acceptance**: 17 automated E2E tests validating Section CRUD, RLS isolation, XSS sanitization, upload verification, draft file download denial, and section deletion lesson safety. All 55 system E2E tests passing.
  - **File Paths**: `apps/api/test/phase3-course-expansion.e2e-spec.ts`

---

## Phase 4 — Assignments & Grading

- [x] **P4-001 — Assignment Creation & Publishing**
  - **Status**: `TESTED`
  - **Dependencies**: P3-011
  - **Acceptance**: Teachers create, edit, draft, publish, close, and soft-delete assignments with titles, instructions, positive max score, and optional due dates. Strict tenant isolation and ownership verified under RLS.
  - **File Paths**: `apps/api/src/modules/assignments/*`, `packages/contracts/src/assignment.ts`, `apps/api/src/modules/assignments/teacher-assignments.controller.ts`

- [x] **P4-002 — Student Submissions & Attachment Handling**
  - **Status**: `TESTED`
  - **Dependencies**: P4-001
  - **Acceptance**: Enrolled students submit text and/or file attachments (max 25MB, MIME whitelist, storage key validation). Server-enforced unique constraint on `(assignmentId, studentId)` prevents duplicate submission. Server-side deadline check flags submissions past due date as `status = LATE`. Unenrolled students denied. Grade and feedback masked until graded.
  - **File Paths**: `apps/api/src/modules/assignments/assignments.service.ts`, `apps/api/src/modules/assignments/student-assignments.controller.ts`, `apps/api/src/modules/files/files.service.ts`

- [x] **P4-003 — Teacher Grading, Atomic GradeRecord & Security**
  - **Status**: `TESTED`
  - **Dependencies**: P4-002
  - **Acceptance**: Teachers review submissions, record score (`0 <= score <= maxScore`), provide written feedback, save grader ID and timestamp; atomic upsert of `GradeRecord` (`itemType = 'ASSIGNMENT'`); grade release policy ensures students see grades only when status is `GRADED`. Cross-student attachment download forbidden.
  - **File Paths**: `apps/api/src/modules/assignments/assignments.service.ts`, `apps/web/src/components/teacher/teacher-assignments-tab.tsx`, `apps/web/src/components/student/student-assignments-view.tsx`

- [x] **P4-004 — Comprehensive Automated Security, Concurrency & Regression Tests**
  - **Status**: `TESTED`
  - **Dependencies**: P4-001 through P4-003
  - **Acceptance**: 22 automated E2E tests validating assignment lifecycle, cross-tenant isolation, student duplicate submission rejection, late submission detection, score bounds validation, feedback saving, atomic `GradeRecord` sync, and cross-student file download authorization. All 77 system E2E tests passing.
  - **File Paths**: `apps/api/test/phase4-assignments-and-grading.e2e-spec.ts`

---

## Phase 5 — Multiple-Choice Exams & Automatic Grading

- [x] **P5-001 — Exam & Question Authoring**
  - **Status**: `TESTED`
  - **Dependencies**: P4-004
  - **Acceptance**: Teachers create timed exams with questions, options, point values, duration, max attempts, and passing score; validates options have single correct answer; correct answers hidden from student responses; cross-tenant isolation enforced.
  - **File Paths**: `apps/api/src/modules/exams/*`, `packages/contracts/src/exam.ts`, `apps/api/src/modules/exams/teacher-exams.controller.ts`

- [x] **P5-002 — Server-Enforced Exam Timer & Attempt Locking**
  - **Status**: `TESTED`
  - **Dependencies**: P5-001
  - **Acceptance**: Student starts attempt; backend sets server-side `deadlineAt`; enforces maximum attempt limits; auto-submits on timeout; strips `isCorrect` from questions payload; locks attempt against answer modifications once finished.
  - **File Paths**: `apps/api/src/modules/exams/exams.service.ts`, `apps/api/src/modules/exams/student-exams.controller.ts`

- [x] **P5-003 — Real-Time Answer Saving & Automatic Grading Engine**
  - **Status**: `TESTED`
  - **Dependencies**: P5-002
  - **Acceptance**: Answers saved incrementally in real time; auto-scores completed attempt upon submission; synchronizes best score into `GradeRecord`; reveals correct answers in post-submission review.
  - **File Paths**: `apps/api/src/modules/exams/exams.service.ts`, `apps/web/src/components/teacher/teacher-exams-tab.tsx`, `apps/web/src/components/student/student-exams-view.tsx`

- [x] **P5-004 — Comprehensive Automated Security, Concurrency & Regression Tests**
  - **Status**: `TESTED`
  - **Dependencies**: P5-001 through P5-003
  - **Acceptance**: 20 automated E2E tests validating exam lifecycle, cross-tenant isolation, question option constraints, student enrollment protection, server-side deadline generation, timer locking, auto-grading calculations, and GradeRecord best score synchronization. All 97 system E2E tests passing.
  - **File Paths**: `apps/api/test/phase5-exams-and-auto-grading.e2e-spec.ts`

---

## Pre-Phase-6 Audit, Bug Fixes & Sessions Verification

- [x] **AUDIT-001 — Fix Course Management Enrolled Students Route & Regression Tests**
  - **Status**: `TESTED`
  - **Dependencies**: P5-004
  - **Acceptance**: Implement `GET /api/v1/teacher/courses/:courseId/students` endpoint in `TeacherCoursesController` and `CoursesService`; enforce tenant isolation, teacher ownership, and 404/400 validation; add course lesson reordering endpoint (`PUT /api/v1/teacher/courses/:courseId/lessons/reorder`); add 6 regression E2E tests in `phase2-courses-and-learning.e2e-spec.ts`. All 103 system E2E tests passing.
  - **File Paths**: `apps/api/src/modules/courses/teacher-courses.controller.ts`, `apps/api/src/modules/courses/courses.service.ts`, `apps/api/src/modules/lessons/lessons.service.ts`, `apps/api/test/phase2-courses-and-learning.e2e-spec.ts`

- [x] **AUDIT-002 — Sessions Architecture & End-to-End Verification Audit**
  - **Status**: `TESTED`
  - **Dependencies**: None
  - **Acceptance**: Complete forensic audit distinguishing authentication sessions (`darb_session` HTTP-only JWT cookies), student exam attempt sessions (`ExamAttempt`), and application/course sessions (out of MVP scope, non-existent in spec); verify cookie lifecycle, session expiry, token validation, and AuthGuard.
  - **File Paths**: `apps/api/src/modules/auth/*`, `apps/api/src/common/guards/auth.guard.ts`, `docs/architecture/SECURITY_MODEL.md`

---

## Phase 6 — Pilot Readiness & Production Hardening
- **Phase Status**: `IN_PROGRESS` (P6-001 completed; P6-002 through P6-006 pending)

- [x] **P6-001 — Production Configuration & Deployment Readiness Audit**
  - **Status**: `TESTED`
  - **Dependencies**: AUDIT-001, AUDIT-002
  - **Acceptance**: Comprehensive audit of environment variables and production configuration; startup validation preventing deployment with insecure placeholder secrets, missing `COOKIE_SECURE=true`, or default database credentials; elimination of hardcoded development origins from production CORS; configurable Swagger docs toggle (`ENABLE_SWAGGER`); secure cookie invalidation on logout; root `.dockerignore` creation; container security hardening with non-root user (`USER node`); unit test coverage in `env.validation.spec.ts`. All 128 tests passing.
  - **File Paths**: `apps/api/src/config/env.validation.ts`, `apps/api/src/main.ts`, `apps/api/src/modules/auth/auth.controller.ts`, `.env.example`, `.dockerignore`, `infra/Dockerfile.api`, `infra/Dockerfile.web`, `infra/docker-compose.yml`, `apps/api/src/config/env.validation.spec.ts`

- [ ] **P6-002 — Pilot Workflow Acceptance Suite**
  - **Status**: `NOT_STARTED`
  - **Dependencies**: P6-001
  - **Acceptance**: Complete student and teacher journeys automated across 2 teachers and 5 students under multi-tenant RLS.

- [ ] **P6-003 — Production Deployment Playbook & Managed DB Runbook**
  - **Status**: `NOT_STARTED`
  - **Dependencies**: P6-001
  - **Acceptance**: Runbook for managed PostgreSQL (AWS RDS / Neon) and S3/R2 object storage setup; secret rotation guidelines.

- [ ] **P6-004 — Managed Object Storage (S3/R2) Cloud Integration**
  - **Status**: `NOT_STARTED`
  - **Dependencies**: P6-001
  - **Acceptance**: Production S3/R2 driver integration and presigned URLs with fallback to LocalStorageProvider.

- [ ] **P6-005 — Monitoring, Alerting & Health Probes Hardening**
  - **Status**: `NOT_STARTED`
  - **Dependencies**: P6-001
  - **Acceptance**: Readiness and liveness probe latency thresholds, database connection pool exhaustion alarms, and structured log sanitization.

- [ ] **P6-006 — Operational Pilot Readiness Sign-off**
  - **Status**: `NOT_STARTED`
  - **Dependencies**: P6-002 through P6-005
  - **Acceptance**: Final operational checklist validation for the pilot launch with 2–5 teachers.
