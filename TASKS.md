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

## Phase 2 — Authentication, Tenancy & Admin Controls

- [ ] **P2-001 — Administrator Student Account Creation & Provisioning**
  - **Status**: `NOT_STARTED`
  - **Dependencies**: P1-008
  - **Acceptance**: Admin API endpoint and UI form to create student accounts with generated usernames and initial passwords without requiring email.
  - **File Paths**: `apps/api/src/modules/users/*`, `apps/web/src/app/(admin)/admin/students/*`

- [ ] **P2-002 — Administrator-Assisted Password Reset Workflow**
  - **Status**: `NOT_STARTED`
  - **Dependencies**: P2-001
  - **Acceptance**: Admin endpoint to reset a student's password after identity verification; records `PASSWORD_RESET` audit log.
  - **File Paths**: `apps/api/src/modules/auth/*`, `apps/web/src/app/(admin)/admin/students/*`

- [ ] **P2-003 — Tenant Workspace Switching & Header Context Resolver**
  - **Status**: `NOT_STARTED`
  - **Dependencies**: P1-008
  - **Acceptance**: Frontend tenant switcher for teachers/admins holding multiple tenant memberships; validates membership before switching active tenant context.
  - **File Paths**: `apps/api/src/common/guards/tenant.guard.ts`, `apps/web/src/components/tenant-switcher.tsx`

- [ ] **P2-004 — Security Audit Log Viewer for Administrators**
  - **Status**: `NOT_STARTED`
  - **Dependencies**: P2-001
  - **Acceptance**: Read-only admin view of security audit events (`USER_LOGIN`, `USER_LOGOUT`, `PASSWORD_RESET`, etc.) with pagination.
  - **File Paths**: `apps/api/src/modules/audit/*`, `apps/web/src/app/(admin)/admin/audit/*`

---

## Phase 3 — Courses, Lessons & Join Codes

- [ ] **P3-001 — Teacher Course Management Endpoints & UI**
  - **Status**: `NOT_STARTED`
  - **Dependencies**: P1-008
  - **Acceptance**: Teachers can create, view, edit, and archive courses within their tenant workspace under RLS.
  - **File Paths**: `apps/api/src/modules/courses/*`, `apps/web/src/app/(teacher)/teacher/courses/*`

- [ ] **P3-002 — Join-Code Generation Engine with Hash Storage**
  - **Status**: `NOT_STARTED`
  - **Dependencies**: P3-001
  - **Acceptance**: Teachers generate join codes with optional expiration and usage limits; raw code displayed once; SHA-256 hash stored in `JoinCode.codeHash`.
  - **File Paths**: `apps/api/src/modules/join-codes/*`

- [ ] **P3-003 — Student Course Join & Enrollment Workflow**
  - **Status**: `NOT_STARTED`
  - **Dependencies**: P3-002
  - **Acceptance**: Students submit join code; backend verifies expiration and usage limits, creates `Enrollment`, and associates student with course.
  - **File Paths**: `apps/api/src/modules/enrollments/*`, `apps/web/src/app/(student)/student/join/*`

- [ ] **P3-004 — Lesson Authoring & Structured Content Display**
  - **Status**: `NOT_STARTED`
  - **Dependencies**: P3-001
  - **Acceptance**: Teachers create lessons with text/markdown and ordering; students view published lessons in RTL reader.
  - **File Paths**: `apps/api/src/modules/lessons/*`, `apps/web/src/app/(student)/student/courses/*`

- [ ] **P3-005 — S3 Pre-Signed Upload & File Attachment Engine**
  - **Status**: `NOT_STARTED`
  - **Dependencies**: P3-004
  - **Acceptance**: Pre-signed `PUT` URLs generated for PDF and worksheet uploads; MIME validation; records linked in `FileObject` and `LessonFile`.
  - **File Paths**: `apps/api/src/modules/files/*`

---

## Phase 4 — Assignments & Grading

- [ ] **P4-001 — Assignment Creation & Due-Date Scheduling**
  - **Status**: `NOT_STARTED`
  - **Dependencies**: P3-001
  - **Acceptance**: Teachers publish assignments with titles, instructions, max scores, and optional due dates.
  - **File Paths**: `apps/api/src/modules/assignments/*`

- [ ] **P4-002 — Student Assignment Submission Workflow**
  - **Status**: `NOT_STARTED`
  - **Dependencies**: P4-001, P3-005
  - **Acceptance**: Students submit text and/or file attachments before or after deadline (marked LATE if overdue); prevents duplicate submissions.
  - **File Paths**: `apps/api/src/modules/submissions/*`, `apps/web/src/app/(student)/student/assignments/*`

- [ ] **P4-003 — Teacher Grading & Feedback Interface**
  - **Status**: `NOT_STARTED`
  - **Dependencies**: P4-002
  - **Acceptance**: Teachers view student submissions, assign numerical scores and text feedback; updates `GradeRecord`.
  - **File Paths**: `apps/api/src/modules/grading/*`, `apps/web/src/app/(teacher)/teacher/grading/*`

---

## Phase 5 — Multiple-Choice Exams & Automatic Grading

- [ ] **P5-001 — Exam Authoring with Multiple-Choice Questions & Options**
  - **Status**: `NOT_STARTED`
  - **Dependencies**: P3-001
  - **Acceptance**: Teachers create timed exams with questions, options, point values, and passing score; correct answers hidden from student responses.
  - **File Paths**: `apps/api/src/modules/exams/*`, `apps/web/src/app/(teacher)/teacher/exams/*`

- [ ] **P5-002 — Exam Attempt Lifecycle & Server-Enforced Deadline**
  - **Status**: `NOT_STARTED`
  - **Dependencies**: P5-001
  - **Acceptance**: Student starts attempt; backend sets server-side `deadlineAt`; enforces maximum attempt limits; auto-submits on timeout.
  - **File Paths**: `apps/api/src/modules/exam-attempts/*`, `apps/web/src/app/(student)/student/exams/*`

- [ ] **P5-003 — Real-Time Answer Saving & Automatic Grading Engine**
  - **Status**: `NOT_STARTED`
  - **Dependencies**: P5-002
  - **Acceptance**: Answers saved incrementally; auto-scores completed attempt upon submission; writes `GradeRecord`.
  - **File Paths**: `apps/api/src/modules/exam-grading/*`

---

## Phase 6 — Pilot Readiness & Production Hardening

- [ ] **P6-001 — End-to-End Pilot Workflow Acceptance Testing**
  - **Status**: `NOT_STARTED`
  - **Dependencies**: P1-008 through P5-003
  - **Acceptance**: Complete journey tested for 2 teachers and 5 students across distinct courses, join codes, lessons, assignments, and exams.
  - **File Paths**: `apps/api/test/pilot-journey.e2e-spec.ts`

- [ ] **P6-002 — Managed Deployment Playbook & Production Configuration**
  - **Status**: `NOT_STARTED`
  - **Dependencies**: P6-001
  - **Acceptance**: AWS RDS / Neon migration runbook; Cloudflare R2 bucket policies; environment secret rotation guide.
  - **File Paths**: `docs/deployment/playbook.md`
