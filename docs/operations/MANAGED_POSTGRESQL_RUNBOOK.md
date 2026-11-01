# DARB — Managed PostgreSQL Runbook & RLS Operational Guide

This runbook specifies the setup, security configuration, connection pooling, Row-Level Security (RLS) verification, migration lifecycle, and disaster recovery procedures for running DARB on managed PostgreSQL 16 (e.g. AWS RDS, Neon, Supabase, or self-hosted high-availability PostgreSQL).

---

## 1. Managed Database Architecture

```
                       [ @darb/api Node.js Instances ]
                         │                       │
     Application Queries │                       │ Schema Migrations (CI/CD)
     (APP_DATABASE_URL)  │                       │ (DATABASE_URL)
                         ▼                       ▼
              ┌─────────────────────┐   ┌─────────────────────┐
              │ PgBouncer Pooler    │   │ Direct Connection   │
              │ (Transaction Mode)  │   │ (Port 5432)         │
              │ User: darb_app      │   │ User: darb_migrator │
              └──────────┬──────────┘   └──────────┬──────────┘
                         │                         │
                         └───────────┬─────────────┘
                                     │ (TLS / Private Subnet)
                                     ▼
                        ┌─────────────────────────┐
                        │   Managed PostgreSQL    │
                        │      PostgreSQL 16      │
                        │  FORCE ROW LEVEL SEC    │
                        │  Schema: public         │
                        └─────────────────────────┘
```

---

## 2. Dual Database Roles & Least-Privilege Provisioning

DARB enforces strict separation of privileges between database schema migration and application runtime.

### 2.1 Role Definitions

| Role Name | Privileges | Used By | Connection String Variable |
|---|---|---|---|
| `darb_migrator` | Database Owner / DDL permissions (CREATE TABLE, ALTER TABLE, CREATE POLICY, etc.) | CI/CD deployment pipeline or release task | `DATABASE_URL` |
| `darb_app` | DML only (SELECT, INSERT, UPDATE, DELETE on tables; USAGE on sequences). `NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE` | NestJS runtime (`PrismaService`) | `APP_DATABASE_URL` |

### 2.2 Managed Database Provisioning SQL Script
Execute the following script once as the PostgreSQL root/admin user (`postgres` or provider admin) during initial database setup:

```sql
-- 1. Create the database
CREATE DATABASE darb_prod WITH ENCODING 'UTF8' LC_COLLATE 'C' LC_CTYPE 'C';

\connect darb_prod

-- 2. Create the migration / DDL owner role
CREATE ROLE darb_migrator WITH LOGIN PASSWORD '<STRONG_MIGRATOR_PASSWORD>' NOSUPERUSER NOCREATEDB NOCREATEROLE;
GRANT ALL ON SCHEMA public TO darb_migrator;
ALTER SCHEMA public OWNER TO darb_migrator;

-- 3. Create the unprivileged runtime application role
-- CRITICAL: Must be NOSUPERUSER and NOBYPASSRLS
CREATE ROLE darb_app WITH LOGIN PASSWORD '<STRONG_APP_PASSWORD>' NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;

-- 4. Grant runtime DML permissions
GRANT USAGE ON SCHEMA public TO darb_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO darb_app;
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO darb_app;

-- 5. Ensure future tables created by darb_migrator automatically grant DML to darb_app
ALTER DEFAULT PRIVILEGES FOR ROLE darb_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO darb_app;

ALTER DEFAULT PRIVILEGES FOR ROLE darb_migrator IN SCHEMA public
  GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO darb_app;
```

---

## 3. PostgreSQL Row-Level Security (RLS) Operational Guide

### 3.1 RLS Mechanism in DARB
All tenant-scoped tables (`Course`, `Section`, `Lesson`, `Enrollment`, `JoinCode`, `Assignment`, `AssignmentSubmission`, `Exam`, `ExamAttempt`, `GradeRecord`, etc.) have Row-Level Security **enabled** and **forced**:

```sql
ALTER TABLE "Course" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Course" FORCE ROW LEVEL SECURITY;

CREATE POLICY course_tenant_isolation ON "Course"
  FOR ALL TO PUBLIC
  USING (
    current_setting('app.bypass_rls', true) = 'on'
    OR "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
  )
  WITH CHECK (
    current_setting('app.bypass_rls', true) = 'on'
    OR "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
  );
```

### 3.2 Tenant Context Setting
The NestJS backend sets the context inside a database transaction:
- **`withTenant(tenantId, fn)`**: Executes `SELECT set_tenant_context($1::uuid)`. In PostgreSQL, this sets `SET LOCAL app.current_tenant_id = $1`.
- **`withBypassRls(fn)`**: Executes `SELECT set_config('app.bypass_rls', 'on', true)` for administrative queries.
- **Transaction Scope**: Because both use `SET LOCAL` (`is_local = true`), the settings are automatically discarded by PostgreSQL as soon as the transaction completes (`COMMIT` or `ROLLBACK`).

### 3.3 Production RLS Verification Query
To audit a deployed database and confirm that no table has un-enforced or disabled RLS, run:

```sql
-- Must return 0 rows for any tenant-owned table lacking RLS or FORCE RLS
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'Course', 'Section', 'Lesson', 'JoinCode', 'Enrollment',
    'FileObject', 'LessonFile', 'LessonProgress',
    'Assignment', 'AssignmentSubmission', 'SubmissionAttachment',
    'Exam', 'ExamQuestion', 'QuestionOption', 'ExamAttempt',
    'AttemptAnswer', 'GradeRecord'
  )
  AND (c.relrowsecurity = false OR c.relforcerowsecurity = false);
```

---

## 4. Connection Pooling (PgBouncer / Supavisor) Configuration

### 4.1 Transaction-Mode Pooler Compatibility
- **Status**: 100% Compatible.
- **Why**: Because DARB wraps tenant operations in `$transaction` and sets `SET LOCAL app.current_tenant_id`, the variable exists solely within the transaction boundaries. Once the transaction ends, the connection returned to the pool is completely clean.

### 4.2 Pooler Ports Separation
- **Prisma Migrations (`DATABASE_URL`)**: Must use direct PostgreSQL connection (port `5432`) or session-mode pooler. Prisma migrations use advisory locks which fail in transaction-mode poolers.
- **Runtime API (`APP_DATABASE_URL`)**: Connects to the transaction-mode pooler (e.g. port `6543` on Supavisor/PgBouncer).

### 4.3 Recommended Pool Sizing
For a pilot deployment (2–5 teachers, up to 100 concurrent students):
- **PostgreSQL Max Connections**: 100
- **PgBouncer Pool Size**: 20 connections per database
- **Prisma Connection Limit**: Set `connection_limit=10` in query string:
  `postgresql://darb_app:<PASS>@<POOL_HOST>:6543/darb_prod?connection_limit=10&sslmode=require`

---

## 5. Prisma Migration Deployment Workflow

### 5.1 Deployment Command
During automated deployment or release jobs:
```bash
# Verify pending migrations without applying
pnpm --filter @darb/api prisma migrate status

# Apply pending migrations
pnpm --filter @darb/api prisma:migrate
```

### 5.2 Critical Safety Rules
1. **Never run `prisma migrate dev` or `prisma db push` in staging or production**: These commands can trigger destructive table drops or data loss.
2. **Always test migrations against a local/staging replica**: Verify migration timing and locking behavior before production deployment.
3. **Use the Expand-Contract Pattern**: Never apply non-backward-compatible column renames or deletions in a migration required by a live application.

---

## 6. Database Connectivity Troubleshooting

| Symptom | Probable Cause | Corrective Action |
|---|---|---|
| `PrismaClientInitializationError: Can't reach database server` | Firewall, Security Group, or incorrect host/port. | Verify PostgreSQL port 5432 is open from the API security group. Check host DNS resolution. |
| `P2024: Timed out fetching a connection from the pool` | Connection pool exhaustion or connection leak. | Increase connection pool limit or inspect long-running transactions. Ensure PgBouncer is in transaction mode. |
| `P2010: Raw query failed: permission denied for table ...` | `darb_app` lacks DML permissions on newly created table. | Run `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO darb_app;` using `darb_migrator`. |
| Empty results returned for enrolled courses/lessons | Missing or null `tenantId` in transaction context. | Ensure controller handler is wrapped in `withTenant(req.tenantId, ...)` or verify tenant membership. |
| `SSL connection has been closed unexpectedly` | Missing SSL parameters or expired CA certificate. | Append `?sslmode=require` to `DATABASE_URL` and `APP_DATABASE_URL`. |

---

## 7. Backup & Restore Operational Boundary

### 7.1 Dependency on Automated Backups
In production, the managed PostgreSQL database must be configured with:
1. **Automated Daily Snapshots**: Retained for a minimum of 30 days.
2. **Continuous WAL Archiving (Point-In-Time-Recovery / PITR)**: Enables recovery to any arbitrary second within the retention window (e.g. 7 days).

### 7.2 Manual Backup Procedure (Pre-Deployment Safeguard)
Before deploying high-impact schema changes:
```bash
# Create an on-demand logical backup
pg_dump -h <DB_HOST> -p 5432 -U darb_migrator -d darb_prod -Fc -f "darb_backup_$(date +%Y%m%d_%H%M%S).dump"
```

### 7.3 Operational Boundary Notice
> [!NOTE]
> This runbook documents the operational architecture, role separation, and restore procedures. In accordance with task scope boundaries, live backup execution and disaster recovery restoration drills were **not executed on live cloud infrastructure** in this task. Scheduled automated backups and restoration acceptance testing remain subject to environment provisioning and subsequent operational phases.
