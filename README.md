# DARB (دَرب) — Arabic-First Educational Platform

DARB is an Arabic-first educational platform designed for a pilot involving teachers and students. It provides teacher-owned isolated workspaces, student accounts that do not require personal email addresses, course management, assignments, and exam workflows.

> **Current Milestone**: Phase 1 — Foundation & Project Setup Only.

---

## Architecture & Technology Stack

- **Monorepo**: Managed with `pnpm@12` workspaces (`apps/api`, `apps/web`, `packages/contracts`).
- **Backend**: NestJS 10 (TypeScript), REST API under `/api/v1`, OpenAPI / Swagger documentation.
- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS, Arabic RTL-first (`dir="rtl"`, `lang="ar"`).
- **Database**: PostgreSQL 16, Prisma ORM 5, version-controlled SQL migrations.
- **Security & Tenancy**: PostgreSQL Row-Level Security (RLS) with transaction-scoped context (`SET LOCAL app.current_tenant_id`), Argon2id password hashing, and HTTP-only session cookies.

---

## Monorepo Structure

```text
darb/
├── apps/
│   ├── api/             # NestJS REST API & Prisma Database Layer
│   │   ├── prisma/      # Schema, reviewed SQL migrations, and seed script
│   │   ├── src/         # Modules (health, auth, tenants), guards, interceptors
│   │   └── test/        # Unit, E2E, and PostgreSQL RLS isolation test suites
│   └── web/             # Next.js 14 Arabic RTL Frontend
│       └── src/
│           ├── app/     # App Router route groups: (public), (auth), (teacher), (student), (admin)
│           └── components/ui/ # Reusable RTL components (Button, Input, Card, etc.)
├── packages/
│   └── contracts/       # Shared DTOs, interfaces, roles, enums, and response envelopes
├── docs/                # Architecture documentation, ERD diagram, and status report
│   ├── erd.md           # Complete Mermaid ERD and domain model notes
│   ├── phase-1-status.md # Phase 1 delivery report and Phase 2 roadmap
│   └── architecture/    # Detailed auth, tenancy, RLS, and storage specifications
├── infra/               # Docker Compose, Dockerfiles, and DB init scripts
├── .env.example         # Environment variable template
└── README.md
```

---

## Getting Started

### 1. Prerequisites
- **Node.js**: `v18.19.0+`
- **Package Manager**: `pnpm` (`v12.x`)
- **Database**: PostgreSQL 16 (local or via Docker)

### 2. Environment Setup
Copy the example environment file:
```bash
cp .env.example .env
```

Ensure PostgreSQL is running and update `DATABASE_URL` in `.env` if needed:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/darb_dev?schema=public
APP_DATABASE_URL=postgresql://darb_app:darb_app_secret@localhost:5432/darb_dev?schema=public
SESSION_SECRET=a-very-secure-random-secret-at-least-32-chars-long!
```

### 3. Install Dependencies
```bash
pnpm install
pnpm approve-builds --all
```

### 4. Database Initialization & Migrations
Run the reviewed database migrations against your development database:
```bash
pnpm db:migrate
```

Populate the database with test teachers, students, courses, and tenant academies:
```bash
pnpm db:seed
```

---

## Running the Applications

### Run Both Frontend and Backend in Parallel
```bash
pnpm dev
```
- **Web Application**: [http://localhost:3000](http://localhost:3000)
- **REST API**: [http://localhost:4000/api/v1](http://localhost:4000/api/v1)
- **Swagger Documentation**: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)

### Run Individually
```bash
pnpm dev:api    # Starts NestJS API on port 4000
pnpm dev:web    # Starts Next.js frontend on port 3000
```

---

## Seed Accounts for Testing

All test accounts share the password: `Darap123456!`

| Role | Username | Workspace / Academy | Notes |
|------|----------|---------------------|-------|
| **Teacher** | `teacher.ahmed` | مدرسة الأندلس (`al-andalus`) | Owner of Physics course |
| **Teacher** | `teacher.layla` | أكاديمية النور (`al-noor`) | Owner of Chemistry course |
| **Student** | `student.tariq` | مدرسة الأندلس (`al-andalus`) | Enrolled in Physics |
| **Student** | `student.sara` | أكاديمية النور (`al-noor`) | Enrolled in Chemistry |
| **Admin** | `admin.darb` | Platform Administrator | Global oversight |

---

## Automated Quality & Testing

### 1. Monorepo Quality Checks
```bash
pnpm lint        # Runs ESLint across all workspaces
pnpm typecheck   # Type-checks contracts, api, and web via TypeScript
```

### 2. Automated Tests
```bash
pnpm test        # Runs backend unit tests and frontend RTL smoke tests
```

### 3. PostgreSQL RLS & Cross-Tenant E2E Tests
```bash
pnpm --filter @darb/api test:e2e
```
Verifies:
- Live and ready health check probes.
- Authentication lifecycle and HTTP-only session cookies.
- Negative cross-tenant tests: proves that Teacher 1 cannot access Teacher 2's courses even with a guessed UUID.
- PostgreSQL engine-level RLS `WITH CHECK` write enforcement.
- Absence of tenant context leakage across pooled transactions.

---

## Docker Local Development (Optional)

To run the full stack using Docker Compose:
```bash
docker compose -f infra/docker-compose.yml up -d
```
This spins up PostgreSQL 16, creates the unprivileged `darb_app` role, and launches both application containers.

---

## Documentation Links

- [Phase 1 Status & Delivery Report](docs/phase-1-status.md)
- [Entity Relationship Diagram (ERD)](docs/erd.md)
- [Authentication & Multi-Tenant RLS Architecture](docs/architecture/auth-and-tenancy.md)
- [Deployment & Managed Storage Strategy](docs/architecture/deployment-and-storage.md)
# Darap
