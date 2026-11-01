# DARB — Managed Object Storage (S3 / Cloudflare R2) Runbook

This runbook defines the architecture, provider configuration, security policies, CORS rules, upload/download lifecycles, and operational troubleshooting for DARB's managed object storage tier supporting AWS S3, Cloudflare R2, and S3-compatible providers.

---

## 1. Storage Architecture Overview

DARB uses a decoupled, direct-to-cloud object storage pattern:

```
    [ Client Browser ] ────────── (1) POST /presign ─────────► [ @darb/api ]
           │                                                         │
           │                                                         │ (Validates RLS,
           │                                                         │  MIME & 25MB cap)
           │                                                         ▼
           │ ◄─────── (2) Returns SigV4 Presigned PUT URL ───────────┤
           │
           ▼
    (3) Direct HTTP PUT
        (Streams bytes)
           │
           ▼
    [ Managed Object Storage ] (AWS S3 or Cloudflare R2)
    (Private Bucket - Zero Public Read Access)
           ▲
           │
           │ (4) POST /complete (Verifies object exists via HeadObject)
           │
    [ @darb/api ] ────────── (5) Persists FileObject in PostgreSQL (under RLS)
```

### Key Architectural Properties:
1. **Zero Bandwidth Bottleneck**: File binary data never proxies through the NestJS API application server. Clients stream directly to S3/R2.
2. **Private by Default**: Storage buckets have **public read/write access completely disabled**. Objects are accessible strictly through short-lived, time-limited presigned URLs (300 seconds for download, 900 seconds for upload).
3. **Dual Driver Architecture**:
   - `S3StorageProvider`: Production driver using `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`, compatible with AWS S3, Cloudflare R2, and MinIO.
   - `LocalStorageProvider`: Lightweight local fallback for offline development, local unit tests, and sandbox environments.
4. **Predictable Namespaces & Tenant Isolation**:
   - Lesson attachments: `tenants/${tenantId}/lessons/${lessonId}/${uuid}-${safeName}`
   - Assignment submissions: `tenants/${tenantId}/assignments/${assignmentId}/students/${studentId}/${uuid}-${safeName}`

---

## 2. Supported Cloud Providers & Setup

### 2.1 AWS S3 Setup

#### Step 1: Create a Private Bucket
- **Bucket Name**: e.g., `darb-production-assets`
- **Region**: e.g., `eu-central-1` or `me-south-1` (Bahrain)
- **Object Ownership**: ACLs disabled (Bucket owner enforced)
- **Block Public Access**: Enable **Block *all* public access** (all 4 checkboxes checked).
- **Default Encryption**: Server-side encryption with Amazon S3 managed keys (SSE-S3).

#### Step 2: Bucket CORS Configuration
Because browser clients upload directly to S3 via presigned `PUT` URLs, CORS must be configured on the S3 bucket:

```json
[
  {
    "AllowedHeaders": [
      "Content-Type",
      "x-amz-*"
    ],
    "AllowedMethods": [
      "PUT",
      "GET",
      "HEAD"
    ],
    "AllowedOrigins": [
      "https://darb.example.com",
      "https://api.darb.example.com"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

#### Step 3: Dedicated IAM User / Role (Least Privilege)
Attach the following policy to the IAM user or ECS task role used by `@darb/api`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "DarbObjectStoragePermissions",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:HeadObject"
      ],
      "Resource": "arn:aws:s3:::darb-production-assets/*"
    }
  ]
}
```

---

### 2.2 Cloudflare R2 Setup (Recommended for Zero Egress Costs)

Cloudflare R2 provides zero egress fees, making it cost-effective for serving educational worksheets and student assignment submissions.

#### Step 1: Create an R2 Bucket
- In the Cloudflare Dashboard: **R2** -> **Create bucket** -> Name: `darb-production-assets`.
- Ensure Public Access is **Off**.

#### Step 2: Configure CORS in R2
In R2 Bucket Settings -> **CORS Policy**:
```json
[
  {
    "AllowedOrigins": [
      "https://darb.example.com"
    ],
    "AllowedMethods": [
      "PUT",
      "GET",
      "HEAD"
    ],
    "AllowedHeaders": [
      "Content-Type",
      "x-amz-*"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

#### Step 3: Create R2 API Token
- Go to **Manage R2 API Tokens** -> **Create API Token**.
- Permissions: **Object Read & Write**.
- Scope: Specific bucket (`darb-production-assets`).
- Record:
  - Account ID: e.g. `a1b2c3d4e5f6g7h8...`
  - Access Key ID
  - Secret Access Key
  - Endpoint: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`

---

## 3. Environment Variable Configuration

| Variable | Required | Default | Description / Example |
|---|---|---|---|
| `STORAGE_PROVIDER` | No | `local` | `'local'`, `'s3'`, or `'r2'`. |
| `STORAGE_BUCKET` | Yes (for s3/r2) | - | Target bucket name (e.g. `darb-production-assets`). |
| `STORAGE_REGION` | No | `us-east-1` (s3) / `auto` (r2) | AWS region or `'auto'` for Cloudflare R2. |
| `STORAGE_ENDPOINT` | Yes (for r2) | - | S3 endpoint URL. Required for R2 (`https://<account_id>.r2.cloudflarestorage.com`). |
| `STORAGE_ACCESS_KEY_ID` | Yes (for s3/r2) | - | S3 / R2 Access Key ID. |
| `STORAGE_SECRET_ACCESS_KEY` | Yes (for s3/r2) | - | S3 / R2 Secret Access Key. |
| `STORAGE_FORCE_PATH_STYLE` | No | `false` | Set to `true` for MinIO or local S3-compatible emulators. |
| `STORAGE_SIGNED_URL_TTL_SECONDS` | No | `900` | Expiration for presigned upload URLs (default 15 minutes). |
| `STORAGE_MAX_FILE_SIZE_BYTES` | No | `26214400` | Maximum file size in bytes (default 25 MB). |

---

## 4. Security & Content Validation Controls

### 4.1 Allowed MIME Types & Extensions
The backend strictly enforces whitelist validation on both MIME types and file extensions:

| Format Category | Allowed MIME Types | Allowed File Extensions |
|---|---|---|
| **PDF Documents** | `application/pdf` | `.pdf` |
| **Images** | `image/jpeg`, `image/png`, `image/webp` | `.jpg`, `.jpeg`, `.png`, `.webp` |
| **Word Documents** | `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | `.doc`, `.docx` |
| **Plain Text** | `text/plain` | `.txt` |

### 4.2 Malicious Upload Defenses
1. **Unpredictable Object Keys**: Object keys include a random UUID (`uuidv4()`) preventing object collisions or enumeration attacks.
2. **Filename Sanitization**: Original filenames are stripped of non-alphanumeric, path-traversal, or command-injection characters, preserving Arabic and English characters (`[a-zA-Z0-9._\-\u0600-\u06FF]`).
3. **No Direct Public URLs**: File objects in S3 are never made public (`isPublic: false`). Access requires authenticated presigned download token generation.
4. **Namespace Verification**: On `POST /complete-upload`, the server validates that `storageKey` matches the strict prefix of the authenticated tenant and lesson/assignment (`tenants/${tenantId}/...`).

---

## 5. Tenant Isolation & PostgreSQL RLS Integration

Metadata records (`FileObject`, `LessonFile`, `SubmissionAttachment`) are stored in PostgreSQL with Row-Level Security **enabled** and **forced**:

- **Teacher Upload**: Creates `FileObject` with `tenantId = activeTenant.id`. Protected by `fileobject_tenant_isolation`.
- **Student Download**: The endpoint `/api/v1/student/files/:id/presign-download` authorizes access **only if**:
  1. The student is actively enrolled in the course associated with the lesson (`Enrollment.status = ACTIVE`).
  2. The lesson is published (`Lesson.isPublished = true`).
  3. The course is published and active.
- **Cross-Tenant Access Denial**:
  - If Teacher Layla (tenant B) queries metadata or tries to delete Teacher Ahmed's file (tenant A), PostgreSQL RLS filters the record out, returning `404 Not Found`.
  - If Student Sara (enrolled in tenant B) attempts to request a download token for Ahmed's file (tenant A), the backend denies access with `403 Forbidden`.

---

## 6. Local Development & Testing Instructions

### Local Mock Mode (`STORAGE_PROVIDER=local`)
For standard local development and CI testing without cloud credentials:
```bash
STORAGE_PROVIDER=local
```
- Uses `LocalStorageProvider`. Presigned URLs point to local mock routes. Object existence is verified in-memory.

### Automated Real HTTP S3-Compatible Integration Tests
Run the standalone S3 integration tests which spin up a real local S3-compatible HTTP server:
```bash
pnpm --filter @darb/api test src/modules/files/s3-storage.provider.spec.ts
```
*Validates*: Real SigV4 signing, direct PUT streaming, GET download streaming, HeadObject metadata checking, and object deletion over HTTP.

### Automated E2E Storage & Security Test Suite
Run the full storage security and tenant-isolation E2E suite:
```bash
pnpm --filter @darb/api test:e2e test/phase6-object-storage.e2e-spec.ts
```

---

## 7. Troubleshooting & Common Operational Errors

| Error | Root Cause | Resolution |
|---|---|---|
| `SignatureDoesNotMatch` | Invalid `STORAGE_SECRET_ACCESS_KEY` or clock drift between server and S3. | Verify secret key. Synchronize host clock via NTP (`systemd-timesyncd`). |
| `AccessDenied` (403 on S3) | IAM policy lacks `s3:PutObject` or `s3:GetObject` on `arn:aws:s3:::<BUCKET>/*`. | Review IAM policy statement resource ARN. Ensure trailing `/*` is included. |
| Browser CORS Error on PUT | Missing or misconfigured S3/R2 CORS policy. | Add `PUT` to `AllowedMethods` and frontend URL to `AllowedOrigins` in bucket CORS. |
| `NoSuchKey` (404 on HeadObject) | File upload did not succeed or was aborted before `/complete-upload` was called. | Inspect browser network tab for failed direct PUT request. |
| `نوع الملف غير مسموح به` | Client uploaded an unapproved MIME type. | Verify file format is among allowed types (PDF, JPG, PNG, DOCX, TXT). |
| `حجم الملف يتجاوز الحد الأقصى` | File size exceeds 25 MB. | Compress document or split pages to stay within 25 MB limit. |
