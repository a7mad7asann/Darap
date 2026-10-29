# DARB Architecture: Managed Hosting & Storage Strategy

This document details deployment patterns for managed services, connection pooling readiness, and object storage integration planned for Phase 2.

---

## 1. Managed PostgreSQL Readiness

DARB's Phase 1 foundation is designed to run seamlessly on managed PostgreSQL providers (such as AWS RDS, Neon, Supabase, or Railway).

### 1.1 Dual Database Connection URLs
DARB uses a dual connection model:
1. `DATABASE_URL`: Administrative connection (used exclusively for running Prisma schema migrations and initial database bootstrapping).
2. `APP_DATABASE_URL`: Application runtime connection (used by NestJS `PrismaService` for day-to-day queries). Connects as `darb_app` (or equivalent role with `NOSUPERUSER NOBYPASSRLS`).

### 1.2 PgBouncer / Supavisor Compatibility
Because DARB's RLS implementation uses transaction-scoped settings (`set_config(..., true)` / `SET LOCAL`), it is **100% compatible with transaction-mode connection poolers** (like PgBouncer or Supabase Supavisor).
- In transaction pooling mode, connections are returned to the pool as soon as the transaction commits or aborts.
- Since `SET LOCAL` is tied to the PostgreSQL transaction lifecycle, it never persists on the physical connection after transaction end.

---

## 2. Managed Object Storage (S3 / R2) Readiness

For Phase 2 (PDF, worksheets, and assignment submissions), DARB will use S3-compatible managed object storage (e.g. AWS S3, Cloudflare R2, or Google Cloud Storage).

### 2.1 File Object Architecture in Schema
The `FileObject` model in `schema.prisma` already includes:
- `id`: UUID.
- `tenantId`: Tenant ownership.
- `storageKey`: S3 path (e.g. `tenants/{tenantId}/courses/{courseId}/{fileId}.pdf`).
- `originalName`: User-facing file name.
- `mimeType`: File MIME type (e.g. `application/pdf`).
- `byteSize`: File size in bytes.
- `isPublic`: Whether file requires pre-signed URL or public CDN access.

### 2.2 Upload Workflow (Phase 2 Roadmap)
1. **Direct Pre-signed URL**: The client requests an upload ticket from `/api/v1/files/presign`.
2. **Backend Authorizes & Generates Ticket**: Server confirms tenant membership, creates a `FileObject` in `DRAFT` status, and generates a pre-signed S3 `PUT` URL with restricted content type and size.
3. **Client Uploads Directly**: Browser streams bytes directly to S3/R2 without loading the API server memory or network bandwidth.
4. **Backend Confirms Upload**: Client notifies `/api/v1/files/confirm` to finalize file availability.

---

## 3. Environment Configuration Separation

| Environment | Database URL | Cookie Secure | CORS Allowed Origins | Rate Limit Max |
|-------------|--------------|---------------|----------------------|----------------|
| **Development** | `localhost:5432/darb_dev` | `false` | `http://localhost:3000` | 5 / minute |
| **Testing / CI** | `localhost:5432/darb_test` | `false` | In-memory / Mock | Disabled / High |
| **Staging** | Managed RDS (Staging) | `true` | `https://staging.darb.app` | 5 / minute |
| **Production** | Managed RDS (HA Replica) | `true` | `https://darb.app` | 5 / minute |
