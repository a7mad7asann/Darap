# DARB — Security & Tenant Isolation Model

This document outlines the security architecture, authorization enforcement, PostgreSQL Row-Level Security (RLS) implementation, and security control matrix for DARB.

---

## 1. Authentication & Session Management

### 1.1 Password Hashing (Argon2id)
- Passwords are encrypted using **Argon2id** (`@node-rs/argon2`), the winner of the Password Hashing Competition.
- Parameters:
  - Memory cost: 19,456 KiB (~19 MB)
  - Time cost: 2 iterations
  - Parallelism: 1 thread
- Password verification is strictly constant-time to resist timing analysis. Passwords, hashes, and secrets are excluded from debug logs.

### 1.2 Session Cookies
- Authentication state is encapsulated inside cryptographically signed JSON Web Tokens (JWT) stored in HTTP-only cookies:
  - `name`: `darb_session`
  - `httpOnly`: `true` (unreachable from JavaScript, neutralizing XSS credential theft).
  - `sameSite`: `lax` (prevents cross-site request forgery on external link traversal).
  - `secure`: `true` in production/staging (enforces HTTPS transmission).
  - `path`: `/`
  - `maxAge`: 24 hours (`SESSION_TTL_HOURS`).
- **No localStorage**: Tokens or credentials are never stored in browser `localStorage`.

### 1.3 Rate Limiting & Account Lockout
- In-memory sliding-window rate limiter per IP and username (`RATE_LIMIT_TTL_MS`, `RATE_LIMIT_MAX_ATTEMPTS`).
- Failed attempts are tracked in `User.failedLoginAttempts`. After 5 consecutive failures, the account is temporarily locked (`User.lockedUntil = now() + 15m`).
- All login attempts (success and failure) trigger audit log entries.

### 1.4 Student Recovery Workflow
- Students log in using username and password without an email address.
- When a student loses access, an administrator verifies student identity out-of-band (e.g. parent phone, national/student ID) and triggers an admin-assisted password reset.
- The reset event is recorded in `AuditLog` with `action: PASSWORD_RESET`.

---

## 2. Authorization & Roles

DARB defines three explicit user roles:
1. `ADMIN`: Platform administrator with oversight over school workspaces, audit logs, and account recovery.
2. `TEACHER`: Workspace owner and instructor with permissions to manage courses, lessons, join codes, assignments, and exams within their tenant.
3. `STUDENT`: Learner enrolled in courses, viewing lessons, submitting assignments, and taking exams.

Authorization is enforced on the backend via NestJS guards:
- `AuthGuard`: Validates session cookie, checks if user is active, loads tenant memberships.
- `RolesGuard`: Enforces `@Roles(UserRole.TEACHER, UserRole.ADMIN)` decorators on controller routes.
- `TenantGuard`: Ensures the user belongs to the requested workspace and prevents cross-tenant spoofing.

---

## 3. PostgreSQL Row-Level Security (RLS) & Multi-Tenant Isolation

### 3.1 Defense-in-Depth Model
Multi-tenancy relies on two independent layers of security:
1. **Application Layer**: NestJS controllers and services query data within the user's active tenant and verify ownership.
2. **Database Engine Layer**: PostgreSQL Row-Level Security (RLS) policies physically filter table rows at the PostgreSQL execution engine level. Even if an application query omits a filter, PostgreSQL returns zero rows from other tenants.

### 3.2 Transaction-Scoped Scoping (`SET LOCAL`)
To prevent tenant context leakage across pooled database connections (such as PgBouncer or Prisma connection pool):
```sql
CREATE OR REPLACE FUNCTION set_tenant_context(p_tenant_id uuid)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', p_tenant_id::text, true);
END;
$$ LANGUAGE plpgsql;
```
The parameter `true` sets the variable locally for the current transaction (`SET LOCAL`). When the transaction commits or aborts, PostgreSQL automatically resets the setting to null.

### 3.3 Non-Superuser Role & FORCE RLS
- All application queries run under `darb_app`, a role configured with `NOSUPERUSER NOBYPASSRLS`.
- All tenant-owned tables enforce `FORCE ROW LEVEL SECURITY`:
  ```sql
  ALTER TABLE "Course" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "Course" FORCE ROW LEVEL SECURITY;

  CREATE POLICY course_tenant_isolation ON "Course"
    FOR ALL TO PUBLIC
    USING ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    WITH CHECK ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
  ```

---

## 4. File Access & Object Storage Security (Phase 2 & 3 Roadmap)

- **Pre-signed S3 Uploads**: Clients will never upload files directly to the NestJS server. The server generates time-limited, pre-signed S3 `PUT` URLs restricted to specific content types and byte sizes.
- **Tenant Key Namespacing**: S3 storage keys are namespaced by tenant ID: `tenants/{tenantId}/courses/{courseId}/{fileId}`.
- **Private by Default**: Files default to `isPublic: false` and are served via short-lived pre-signed download URLs.

---

## 5. Exam Integrity & Security (Phase 5 Roadmap)

- **Answer Privacy**: `QuestionOption.isCorrect` is strictly omitted from student responses during an active exam attempt.
- **Server-Enforced Deadlines**: Exam attempt expiration is calculated and enforced on the server (`deadlineAt`). Client-side countdowns are purely cosmetic. Submissions received after `deadlineAt` are automatically finalized and rejected.
- **Attempt Locking**: Unique database constraint `[examId, studentId, attemptNumber]` prevents duplicate concurrent attempts.

---

## 6. Security Controls Status: Implemented vs Planned

| Control | Status | Verification Method |
|---|---|---|
| **Argon2id Hashing** | `IMPLEMENTED` | Tested in `auth.service.spec.ts` |
| **HTTP-Only Session Cookies** | `IMPLEMENTED` | Tested in `health-and-auth.e2e-spec.ts` |
| **No localStorage Storage** | `IMPLEMENTED` | Codebase verified: tokens never in browser storage |
| **Brute Force Rate Limiting** | `IMPLEMENTED` | Tested in `auth.service.spec.ts` |
| **Account Lockout (5 attempts)** | `IMPLEMENTED` | Tested in `auth.service.spec.ts` |
| **Database RLS Policies** | `IMPLEMENTED` | Tested in `tenant-rls.e2e-spec.ts` |
| **Unprivileged DB Role (darb_app)** | `IMPLEMENTED` | Tested in `tenant-rls.e2e-spec.ts` |
| **Cross-Tenant Guessed UUID Protection** | `IMPLEMENTED` | Tested in `tenant-rls.e2e-spec.ts` |
| **Connection Pool Leak Protection** | `IMPLEMENTED` | Tested in `tenant-rls.e2e-spec.ts` |
| **Error Message Sanitization** | `IMPLEMENTED` | Tested in `AllExceptionsFilter` |
| **Admin Student Password Reset** | `PLANNED` | Phase 2 implementation |
| **S3 Pre-signed Upload URLs** | `PLANNED` | Phase 3 implementation |
| **Server-Enforced Exam Timer** | `PLANNED` | Phase 5 implementation |

---

## 7. Outstanding Security Risks & Mitigations

1. **In-Memory Rate Limiting**: Suitable for single-instance pilot deployments. When scaling across multiple container instances, rate-limiting state must transition to a distributed store.
2. **Admin Social Engineering Risk**: Since student password recovery is admin-assisted, pilot administrators must enforce out-of-band verification (parent contact / student ID card check) before resetting credentials.
