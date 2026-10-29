# DARB — System Architecture Overview

This document provides a high-level technical overview of the DARB educational platform architecture, runtime boundaries, module responsibilities, and deployment topology.

---

## 1. High-Level Architecture

DARB is built as a modular monorepo containing a NestJS REST API backend and a Next.js 14 App Router frontend with a shared contracts library.

```text
[ Browser / Mobile Client ]
         │ (HTTPS / HTTP-only Cookies)
         ▼
┌─────────────────────────────────────────────────────────────┐
│                       Next.js 14 App Router                 │
│                 (Arabic RTL UI / SSR / Client Components)   │
│  - Public routes: /                                         │
│  - Auth routes: /login                                      │
│  - Teacher shell: /teacher/*                                │
│  - Student shell: /student/*                                │
│  - Admin shell: /admin/*                                    │
└──────────────────────────────┬──────────────────────────────┘
                               │ (REST API / JSON / Cookies)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                       NestJS 10 REST API                    │
│                 (Port 4000, prefix /api/v1)                 │
│  - Interceptors: Request ID, Transform Response             │
│  - Exception Filter: AllExceptionsFilter (Sanitizer)        │
│  - Guards: AuthGuard, RolesGuard, TenantGuard               │
│  - Modules: Health, Auth, Users, Tenants, Courses, Files    │
└──────────────────────────────┬──────────────────────────────┘
                               │ (Prisma Client with SET LOCAL)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    PostgreSQL 16 Engine                     │
│  - Superuser / Migration Connection: postgres               │
│  - Application Connection: darb_app (NOBYPASSRLS)          │
│  - Row-Level Security: FORCE ROW LEVEL SECURITY             │
│  - Scoping: set_tenant_context() in interactive transactions│
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Monorepo Workspaces & Responsibilities

| Workspace | Package Name | Responsibility | Tech Stack |
|---|---|---|---|
| `apps/api` | `@darb/api` | REST API, authentication, tenant isolation, database migrations, business logic, health checks, Swagger documentation. | NestJS 10, Prisma 5.22, Argon2id, class-validator, Jest, Supertest |
| `apps/web` | `@darb/web` | Arabic RTL-first web interface, responsive student and teacher interfaces, form handling, client-side session state. | Next.js 14 (App Router), React 18, Tailwind CSS, Cairo typography |
| `packages/contracts` | `@darb/contracts` | Shared TypeScript interfaces, DTO definitions, roles, enums, and API response envelope contracts. | TypeScript 5 (composite project) |

---

## 3. Communication & Runtime Boundaries

### 3.1 Frontend-Backend Contract
- All backend REST routes are namespaced under `/api/v1`.
- Requests and responses follow a standard envelope:
  - Success: `{ success: true, data: T, message?: string, timestamp: string, requestId: string }`
  - Error: `{ success: false, statusCode: number, error: string, message: string | string[], timestamp: string, path: string, requestId: string }`
- State-changing requests (`POST`, `PUT`, `DELETE`) require `Content-Type: application/json`.
- Authentication is transmitted via HTTP-only, `SameSite=Lax` cookies named `darb_session`.

### 3.2 Database Access & RLS Boundary
- The application executes queries through `PrismaService`.
- For tenant-owned entities (`Course`, `Lesson`, `Assignment`, `Exam`, `FileObject`, etc.), operations are executed via `prismaService.withTenant(tenantId, async (tx) => ...)`.
- Inside `withTenant()`, an interactive PostgreSQL transaction executes `SELECT set_tenant_context(tenantId::uuid)`.
- The connection runs as `darb_app` (`NOSUPERUSER NOBYPASSRLS`), meaning PostgreSQL's engine unconditionally enforces tenant isolation.

---

## 4. Environment Configuration

Configuration is validated at startup in `apps/api/src/config/env.validation.ts` using `class-validator`:

| Variable | Description | Default | Validation Rule |
|---|---|---|---|
| `PORT` | API server listening port | `4000` | Number >= 1024 |
| `NODE_ENV` | Environment identifier | `development` | `development`, `production`, `test` |
| `DATABASE_URL` | Admin / Migration PostgreSQL connection URL | — | Required connection string |
| `APP_DATABASE_URL` | Unprivileged application role connection URL | Falls back to `DATABASE_URL` | Required for strict RLS in staging/prod |
| `SESSION_SECRET` | Secret key for signing session JWT cookies | — | Required string, min length 32 chars |
| `COOKIE_NAME` | Session cookie identifier | `darb_session` | String |
| `COOKIE_SECURE` | Enforce HTTPS on cookies | `false` | Boolean (`true` in production) |
| `COOKIE_SAME_SITE` | Cookie SameSite policy | `lax` | `lax`, `strict`, `none` |
| `RATE_LIMIT_TTL_MS` | Rate limiting sliding window in ms | `60000` | Number |
| `RATE_LIMIT_MAX_ATTEMPTS` | Maximum login attempts within window | `5` | Number |
| `NEXT_PUBLIC_API_URL` | Base API URL consumed by web frontend | `http://localhost:4000/api/v1` | URL string |
