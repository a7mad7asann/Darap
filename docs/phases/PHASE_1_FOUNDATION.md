# Phase 1 Report — Foundation & Project Setup

- **Phase Objective**: Establish a clean, maintainable, and secure technical foundation for DARB that later phases can extend without architectural rewrites.
- **Final Phase Status**: `COMPLETED`
- **Verification Date**: 2026-10-29

---

## 1. Scope & Acceptance Criteria

| Item | Requirement | Verification Method | Status |
|---|---|---|---|
| 1 | Monorepo structure with `api`, `web`, `contracts` | `pnpm` workspaces; builds successfully | Verified |
| 2 | Initial 22-entity domain model and Prisma schema | `schema.prisma` generated | Verified |
| 3 | Version-controlled PostgreSQL migrations | `prisma migrate deploy` on `darb_dev` | Verified |
| 4 | Engine-level PostgreSQL Row-Level Security (RLS) | `FORCE ROW LEVEL SECURITY` + negative tests | Verified |
| 5 | Non-superuser DB role (`darb_app`) | Connection via `darb_app` in E2E tests | Verified |
| 6 | Username/password authentication with Argon2id | Unit tests & cookie issuance verified | Verified |
| 7 | Student login without personal email requirement | Tested with student account fixture | Verified |
| 8 | Liveness & Readiness health endpoints | E2E tests on `/health/live`, `/health/ready` | Verified |
| 9 | Arabic RTL-first Next.js 14 frontend shell | RTL smoke test in JSDOM; Next.js build | Verified |
| 10 | Automated test suite and CI configuration | 29 tests passing; `.github/workflows/ci.yml` | Verified |

---

## 2. Work Completed

1. Initialized monorepo with `pnpm@12.16.1` workspaces.
2. Implemented shared contracts library (`@darb/contracts`) containing DTOs, roles, enums, and API envelopes.
3. Defined complete 22-entity MVP schema in `apps/api/prisma/schema.prisma`.
4. Applied migration `20261029092508_init_darb_mvp` enabling RLS on all tenant-owned tables and creating `set_tenant_context()`.
5. Created development seed script populating 2 academies, 2 teachers, 2 students in separate tenants, 1 admin, and 2 sample courses.
6. Implemented Argon2id password hashing, HTTP-only session cookies (`darb_session`), account lockout after 5 failed attempts, and rate limiting.
7. Implemented correlation ID interceptor, response transformation interceptor, and exception filter sanitizing database errors.
8. Created OpenAPI / Swagger documentation mounted at `/api/docs` and `/api/v1/docs`.
9. Built Arabic RTL shell in Next.js 14 App Router with Cairo typography and reusable UI components (Button, Input, Card, Form, Loading, EmptyState, ErrorState).
10. Added comprehensive test suites: 14 unit tests, 13 E2E and RLS tests, 2 frontend smoke tests.

---

## 3. Files Created, Modified, and Deleted

### Created Files
- `package.json`, `pnpm-workspace.yaml`, `.npmrc`, `.prettierrc`, `.env.example`, `.gitignore`, `README.md`
- `packages/contracts/package.json`, `tsconfig.json`, `src/index.ts`, `src/enums.ts`, `src/auth.ts`, `src/response.ts`
- `apps/api/package.json`, `tsconfig.json`, `nest-cli.json`, `.eslintrc.js`
- `apps/api/prisma/schema.prisma`, `apps/api/prisma/seed.ts`
- `apps/api/prisma/migrations/20261029092508_init_darb_mvp/migration.sql`
- `apps/api/src/main.ts`, `app.module.ts`, `config/env.validation.ts`
- `apps/api/src/database/database.module.ts`, `database/prisma.service.ts`
- `apps/api/src/common/guards/*`, `common/decorators/*`, `common/interceptors/*`, `common/filters/*`
- `apps/api/src/modules/health/*`, `modules/auth/*`, `modules/tenants/*`
- `apps/api/test/setup.ts`, `jest-unit.json`, `jest-e2e.json`, `tenant-rls.e2e-spec.ts`, `health-and-auth.e2e-spec.ts`
- `apps/web/package.json`, `tsconfig.json`, `next.config.js`, `postcss.config.js`, `tailwind.config.ts`, `.eslintrc.json`, `jest.config.js`, `jest.setup.js`
- `apps/web/src/app/*` (layout, globals.css, page.tsx, login, teacher, student, admin)
- `apps/web/src/components/ui/*` (button, card, input, form, loading, empty-state, error-state)
- `apps/web/src/lib/api-client.ts`, `lib/utils.ts`
- `infra/docker-compose.yml`, `infra/init-db.sql`, `infra/Dockerfile.api`, `infra/Dockerfile.web`
- `.github/workflows/ci.yml`
- `docs/erd.md`, `docs/phase-1-status.md`, `docs/architecture/*`
- `PROJECT_MEMORY.md`, `CHANGELOG.md`, `TASKS.md`

### Modified / Deleted Files
- No legacy files overwritten blindly; created clean project tree in empty workspace.

---

## 4. Database Changes & Migration Identifiers

- **Migration**: `20261029092508_init_darb_mvp`
- **Database Engine Role**: `darb_app` (`NOSUPERUSER NOBYPASSRLS`)
- **Key SQL Policies**:
  - `course_tenant_isolation`
  - `joincode_tenant_isolation`
  - `enrollment_tenant_isolation`
  - `lesson_tenant_isolation`
  - `fileobject_tenant_isolation`
  - `lessonfile_tenant_isolation`
  - `lessonprogress_tenant_isolation`
  - `assignment_tenant_isolation`
  - `submission_tenant_isolation`
  - `submissionattachment_tenant_isolation`
  - `exam_tenant_isolation`
  - `examquestion_tenant_isolation`
  - `examattempt_tenant_isolation`
  - `attemptanswer_tenant_isolation`
  - `graderecord_tenant_isolation`
- **Helper Function**: `set_tenant_context(p_tenant_id uuid)` utilizing transaction-local setting (`true`).

---

## 5. API Endpoints Added

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/health/live` | Liveness probe returning uptime | No |
| `GET` | `/api/v1/health/ready` | Readiness probe verifying DB connectivity | No |
| `POST` | `/api/v1/auth/login` | Authenticate with username/password, sets HTTP-only cookie | No |
| `POST` | `/api/v1/auth/logout` | Clear session cookie and record audit event | Yes (`AuthGuard`) |
| `GET` | `/api/v1/auth/me` | Return authenticated user, active tenant, and memberships | Yes (`AuthGuard`) |

---

## 6. Tests Executed & Real Results

1. **Monorepo Linting & Typecheck**:
   - `pnpm lint` -> 0 errors, 0 warnings.
   - `pnpm typecheck` -> Passed across all 3 workspaces (`contracts`, `api`, `web`).
2. **Backend Unit Tests** (`pnpm --filter @darb/api test`):
   - `env.validation.spec.ts` -> 4 tests passed.
   - `auth.service.spec.ts` -> 4 tests passed (Argon2id hashing, verification, lockout).
   - `guards.spec.ts` -> 6 tests passed (RolesGuard, TenantGuard, header spoofing prevention).
   - Total: 14 passed, 14 total.
3. **Backend E2E & RLS Tests** (`pnpm --filter @darb/api test:e2e`):
   - `health-and-auth.e2e-spec.ts` -> 7 tests passed (health checks, login flow, cookie setting, `/me`, logout).
   - `tenant-rls.e2e-spec.ts` -> 6 tests passed (Default deny, Tenant 1 isolation, negative cross-tenant read by guessed UUID, Tenant 2 isolation, negative cross-tenant write violation, connection pool reset safety).
   - Total: 13 passed, 13 total.
4. **Frontend RTL Smoke Tests** (`pnpm --filter @darb/web test`):
   - `layout.test.tsx` -> 2 tests passed (Arabic text rendering, RTL layout structure, form inputs).
5. **Production Build** (`pnpm build`):
   - `@darb/contracts`: Clean TypeScript build.
   - `@darb/api`: Clean NestJS distribution build (`dist/main.js`).
   - `@darb/web`: Next.js 14 production bundle with 8 optimized static pages.

---

## 7. Screens Completed

- Landing Page: [`/`](file:///home/user/Documents/Darap/apps/web/src/app/page.tsx)
- Login Page with 1-Click Demo Credentials: [`/login`](file:///home/user/Documents/Darap/apps/web/src/app/(auth)/login/page.tsx)
- Teacher Workspace Shell: [`/teacher`](file:///home/user/Documents/Darap/apps/web/src/app/(teacher)/teacher/page.tsx)
- Student Portal Shell: [`/student`](file:///home/user/Documents/Darap/apps/web/src/app/(student)/student/page.tsx)
- Admin Oversight Shell: [`/admin`](file:///home/user/Documents/Darap/apps/web/src/app/(admin)/admin/page.tsx)

---

## 8. Known Bugs & Technical Debt

- In-memory rate limiting map in `AuthService` will need a shared cache in a multi-instance production cluster.
- Frontend test runner relies on JSDOM; end-to-end browser navigation (Playwright/Cypress) will be introduced in Phase 6.

---

## 9. Deferred Requirements

- Business CRUD operations for Courses, Lessons, Join Codes, Files, Assignments, and Exams were intentionally deferred to later phases per Phase 1 scope instructions.

---

## 10. Security & Privacy Considerations

- Passwords never stored or logged in plaintext (Argon2id).
- Tokens never placed in `localStorage` (HTTP-only cookies).
- Database queries executed with `darb_app` (`NOBYPASSRLS`), preventing table owner or application queries from ignoring tenant boundaries.

---

## 11. Decisions Made & Pending

- **Confirmed**: Student username login, teacher tenant workspaces, transaction-scoped RLS.
- **Pending**: Exact staging domain setup for cookie SameSite cross-subdomain policy.

---

## 12. Remaining Tasks

- Phase 1 tasks are 100% completed.

---

## 13. Recommended Next Steps for Phase 2

1. Implement Administrator student account creation (`P2-001`).
2. Implement Administrator-assisted password reset workflow (`P2-002`).
3. Add tenant switching UI component for multi-workspace users (`P2-003`).
4. Add admin audit log viewer (`P2-004`).
