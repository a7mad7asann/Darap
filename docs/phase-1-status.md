# DARB MVP — Phase 1 Status Report: Foundation & Project Setup

**Date**: 2026-10-29  
**Phase**: Phase 1 — Foundation & Project Setup Only  
**Status**: Completed and Verified

---

## 1. Completed Work

### 1.1 Repository Architecture & Monorepo
- Established a clean monorepo managed via `pnpm@12.16.1` workspaces:
  - `apps/api`: NestJS backend application with REST architecture under `/api/v1`.
  - `apps/web`: Next.js 14 App Router Arabic RTL frontend application.
  - `packages/contracts`: Shared TypeScript types, enums, DTOs, and API response envelopes.
  - `infra/`: Docker Compose, init scripts, and Dockerfiles.
  - `docs/`: Comprehensive ERD, architecture specifications, and status documentation.
- Unified linting (`eslint`), formatting (`prettier`), and type checking (`tsc --noEmit`).

### 1.2 Domain Model & Database Migrations
- Defined the complete 22-entity MVP domain model in `apps/api/prisma/schema.prisma` covering:
  - `Tenant`, `User`, `Membership`, `TeacherProfile`, `StudentProfile`, `Course`, `JoinCode`, `Enrollment`, `Lesson`, `FileObject`, `LessonFile`, `LessonProgress`, `Assignment`, `AssignmentSubmission`, `SubmissionAttachment`, `Exam`, `ExamQuestion`, `QuestionOption`, `ExamAttempt`, `AttemptAnswer`, `GradeRecord`, `AuditLog`.
- Generated and executed reviewed SQL migration (`20261029092508_init_darb_mvp`) with explicit UUID primary keys, `timestamptz(6)` timestamps, foreign keys, unique constraints, and indexes.
- Created and executed a database seed script (`prisma/seed.ts`) populating 2 distinct tenant academies, 2 teachers, 2 students in separate tenants, 1 platform administrator, and 2 courses.

### 1.3 Tenant Isolation & PostgreSQL Row-Level Security (RLS)
- Implemented transaction-scoped PostgreSQL RLS (`SET LOCAL app.current_tenant_id`) via `set_tenant_context()`.
- Created dedicated runtime role `darb_app` with `NOSUPERUSER NOBYPASSRLS`.
- Enforced `FORCE ROW LEVEL SECURITY` across all tenant-owned tables (`Course`, `Lesson`, `Assignment`, `Exam`, `FileObject`, `Enrollment`, `JoinCode`, etc.).
- Proved tenant isolation with automated negative e2e tests in `apps/api/test/tenant-rls.e2e-spec.ts`:
  - Verified default deny behavior when no tenant context is set.
  - Verified Teacher 1 cannot view or modify Teacher 2's courses.
  - Verified cross-tenant UUID queries return `null`.
  - Verified cross-tenant write attempts are rejected with PostgreSQL RLS `WITH CHECK` violations.
  - Verified connection pooling safety with zero context leakage across transactions.

### 1.4 Authentication & Security Foundation
- Username and password authentication implemented with constant-time **Argon2id** password hashing.
- Students log in using usernames without requiring personal email addresses.
- HTTP-only, SameSite=Lax session cookies configured (`darb_session`). Tokens are never stored in browser `localStorage`.
- Account lockout policy enforced after 5 failed login attempts (`lockedUntil`).
- In-memory rate limiting applied to login attempts.
- Security audit logging implemented for `USER_LOGIN` and `USER_LOGOUT` events.
- Centralized exception filter (`AllExceptionsFilter`) preventing internal database errors or stack traces from leaking to clients.
- Environment variable validation implemented at startup via `class-validator` and `validateEnv()`.

### 1.5 API Layer & Health Checks
- REST API mounted under `/api/v1`.
- OpenAPI / Swagger interactive documentation generated at `/api/docs` and `/api/v1/docs`.
- Standard endpoints implemented and tested:
  - `GET /api/v1/health/live` (Liveness probe with correlation ID)
  - `GET /api/v1/health/ready` (Readiness probe verifying DB connection)
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/logout`
  - `GET /api/v1/auth/me`

### 1.6 Frontend Foundation (Arabic RTL)
- Root layout configured with `dir="rtl"` and `lang="ar"`.
- Arabic typography enabled using Google Font `Cairo` with system fallbacks.
- Reusable UI component library created with Tailwind CSS: `Button`, `Input`, `Card`, `FormField`, `Loading`, `EmptyState`, `ErrorState`.
- Connected Arabic login page (`apps/web/src/app/(auth)/login/page.tsx`) with 1-click test credentials.
- Clear route group shells: `(public)`, `(auth)`, `(teacher)`, `(student)`, `(admin)`.
- Frontend RTL smoke test passed.

### 1.7 Testing & CI
- 14 backend unit tests passed.
- 13 backend e2e and RLS isolation tests passed.
- 2 frontend RTL smoke tests passed.
- Production build succeeds across all monorepo workspaces.
- GitHub Actions CI workflow created (`.github/workflows/ci.yml`).

---

## 2. Incomplete Work (Intentionally Deferred by Scope Guardrails)

Per Section 13 Scope Guardrails, the following features are designed in schema and architecture but intentionally not implemented in Phase 1:
1. **Course and Lesson Authoring**: CRUD screens and endpoints for courses and lessons (Phase 2).
2. **Join-Code Generation & Redemption**: Teacher generation and student redemption workflows (Phase 2).
3. **File & PDF Uploads**: Pre-signed S3 URL generation and upload confirmation (Phase 2).
4. **Assignment Submissions & Grading**: Student submission workflows and manual grading UI (Phase 3).
5. **Exam Engine & Automatic Grading**: Server-enforced exam timer, attempt recording, and auto-grader (Phase 3).
6. **Administrator Dashboard UI**: Student account creation and password reset screens (Phase 2).

---

## 3. Known Risks & Security Limitations

1. **In-Memory Rate Limiting**: The current rate limiter tracks failed login attempts in application memory. For single-instance pilot deployments this is sufficient; for multi-instance deployments behind a load balancer, rate limiting state should be centralized.
2. **Local Development Docker**: The evaluation environment does not have the Docker daemon running; PostgreSQL was run natively in user space for testing and migrations. A full `docker-compose.yml` and `init-db.sql` are provided for standard development environments.
3. **Admin Password Reset Verification**: For the pilot, student password resets must be initiated by an administrator. An audit log is recorded, but out-of-band verification procedures (confirming identity with parents or school ID) must be followed by administrative staff.

---

## 4. Architectural Decisions Requiring Approval

1. **Argon2id Resource Parameters**: Configured to 19 MB memory cost and 2 time iterations. Need confirmation that deployment container resources (e.g. 512MB RAM minimum) are allocated for the API service.
2. **Session Cookie Scope**: Configured with `SameSite: 'lax'`. If the frontend and backend are hosted on separate apex domains in production (e.g. `darb.edu` and `api-darb.cloud`), `SameSite: 'none'` with `Secure: true` will be required.

---

## 5. Recommended Next Tasks for Phase 2

1. **Course Management Service & UI**: Endpoints and teacher views for creating courses, editing lesson content, and publishing.
2. **Join Code Engine**: Logic to hash join codes (`SHA-256`), enforce expiry and usage limits, and bind student enrollment records.
3. **S3 Pre-Signed Upload Service**: Implement pre-signed URL generation for PDF and document uploads with MIME type allowlisting.
4. **Student Course Viewer**: Student shell UI to browse enrolled courses and view published lessons.
