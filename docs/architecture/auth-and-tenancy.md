# DARB Architecture: Authentication, Security & Tenant Isolation

This document outlines the security architecture, authentication implementation, and PostgreSQL Row-Level Security (RLS) tenant isolation strategy implemented for Phase 1.

---

## 1. Authentication Foundation

### 1.1 Password Hashing with Argon2id
- **Algorithm**: Argon2id (`v=19`).
- **Parameters**:
  - Memory cost: 19,456 KiB (~19 MB)
  - Time cost (iterations): 2
  - Parallelism: 1 thread
- Passwords are never stored or logged in plaintext. Comparison is handled in constant-time via `@node-rs/argon2`.

### 1.2 Session Management & Cookie Security
- Authentication state is maintained using **HTTP-only, SameSite cookies** containing a cryptographically signed JWT.
- **Attributes**:
  - `HttpOnly: true` (prevents client-side scripts / XSS from accessing tokens).
  - `SameSite: Lax` (prevents cross-site request forgery while allowing top-level navigation).
  - `Secure: true` in production and staging environments (enforces HTTPS).
  - `Path: /`
  - `Max-Age: 24h` (configurable via `SESSION_TTL_HOURS`).
- **No localStorage**: Tokens are never stored in browser `localStorage` or `sessionStorage`.

### 1.3 CSRF Protection Strategy
- Session cookies are protected against CSRF via `SameSite=Lax`.
- State-changing API endpoints (`POST`, `PUT`, `DELETE`) require `Content-Type: application/json` which triggers browser CORS preflights (`OPTIONS`) on cross-origin requests.
- Future phases may introduce explicit double-submit CSRF tokens if cross-origin embedded contexts are required.

### 1.4 Rate Limiting & Account Lockout
- **Rate Limiting**: Sliding window rate limiter applied to login requests per IP and username (`RATE_LIMIT_TTL_MS`, `RATE_LIMIT_MAX_ATTEMPTS`).
- **Account Lockout**: After 5 consecutive failed login attempts, the account is temporarily locked (`lockedUntil` set to `now() + 15m`) and a security audit event is logged.

### 1.5 Student Login Without Personal Email
- In accordance with the product requirements, Egyptian and Arab school students often do not have personal email addresses.
- Login is strictly username-based (`User.username`).
- **Password Recovery Flow for Pilot**:
  1. Student requests password assistance through their teacher or school administrator.
  2. School Administrator logs into the admin portal, verifies student identity (via student code / national ID / parent phone registered in `StudentProfile`).
  3. Administrator triggers a temporary one-time password reset.
  4. The event is permanently recorded in `AuditLog` (`action: PASSWORD_RESET`).

---

## 2. Multi-Tenant Isolation & PostgreSQL Row-Level Security (RLS)

### 2.1 The Multi-Tenancy Challenge with Connection Pooling
Traditional multi-tenant systems using ORMs often rely on application-level `WHERE tenant_id = ...` clauses. A single forgotten `where` clause or a guessed UUID can lead to catastrophic cross-tenant data leaks.
Furthermore, using PostgreSQL session settings (`SET app.current_tenant_id = '...'`) can leak between requests when connection pooling (such as PgBouncer or Prisma's internal pool) reuses the connection for another request.

### 2.2 DARB's Solution: Transaction-Scoped RLS (`SET LOCAL`)
DARB enforces tenant isolation directly in PostgreSQL through **Row-Level Security (RLS)** with transaction-scoped variables:

```sql
-- Helper function to set the transaction-local tenant context
CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id uuid)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', p_tenant_id::text, true);
END;
$$ LANGUAGE plpgsql;
```

The third argument (`true`) instructs PostgreSQL to make the setting **local to the current transaction** (`SET LOCAL`). When the transaction commits or rolls back, PostgreSQL automatically resets the setting to null. This guarantees **zero context leakage** across pooled connections.

### 2.3 Non-Superuser Application Role
- In PostgreSQL, superusers and roles with `BYPASSRLS` ignore RLS policies.
- DARB configures a dedicated runtime application role:
  ```sql
  CREATE ROLE darb_app WITH LOGIN PASSWORD 'darb_app_secret'
    NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  ```
- All tenant-owned tables enforce `FORCE ROW LEVEL SECURITY`:
  ```sql
  ALTER TABLE "Course" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "Course" FORCE ROW LEVEL SECURITY;

  CREATE POLICY course_tenant_isolation ON "Course"
    FOR ALL TO PUBLIC
    USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
  ```

### 2.4 Tenant Resolution & Defense-in-Depth
1. **Never Trust Client Tenant ID**: A client cannot send `x-tenant-id` to access a tenant unless they hold an active `Membership` in that specific tenant.
2. **NestJS Guards**:
   - `AuthGuard`: Validates session cookie, queries user memberships.
   - `TenantGuard`: Resolves active tenant from user's verified memberships. Rejects spoofed header requests with `403 Forbidden`.
   - `PrismaService.withTenant(tenantId, tx => ...)`: Wraps queries in an interactive PostgreSQL transaction with `set_tenant_context(tenantId)`.
3. **Database RLS Engine**: Even if a query attempts to query `Course` by a foreign UUID, PostgreSQL RLS returns `NULL` or 0 rows.

### 2.5 Automated Verification Tests
The RLS implementation is verified by automated negative test cases in `apps/api/test/tenant-rls.e2e-spec.ts`:
- **Default Deny**: Running queries without setting tenant context returns 0 rows.
- **Cross-Tenant Read Negative Test**: Teacher 1 attempting to query Teacher 2's course by exact UUID returns `null`.
- **Cross-Tenant Write Negative Test**: Attempting to insert a record with another tenant's ID fails with PostgreSQL RLS `WITH CHECK` policy violation.
- **Connection Pool Leakage Test**: Successive transactions on the same connection verify that tenant context resets completely upon commit.
