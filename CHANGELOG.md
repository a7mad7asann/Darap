# DARB Changelog

All notable changes to the DARB platform are documented in this file in reverse chronological order.

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
