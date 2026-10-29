# DARB Changelog

All notable changes to the DARB platform are documented in this file in reverse chronological order.

---

## 2026-10-29 — Pre-Phase-6 Audit, Bug Fixes & Sessions Verification

### Summary
- Completed comprehensive audit of course management workflows, session mechanisms, and authentication lifecycle.
- **Course Management Bug Fix**:
  - Investigated and resolved `Cannot GET /api/v1/teacher/courses/22222222-2222-2222-2222-222222222222/students`.
  - Root cause: The frontend course details page (`apps/web/src/app/(teacher)/teacher/courses/[courseId]/page.tsx`) requested `apiClient.getCourseStudents(courseId)`, but the route handler `@Get(':courseId/students')` was missing from `TeacherCoursesController`.
  - Fix: Added `@Get(':courseId/students')` route in `TeacherCoursesController` and implemented `getCourseStudents` in `CoursesService` with tenant RLS isolation, teacher ownership enforcement, UUID validation, and Arabic `404 Not Found` response for non-existent courses.
  - Added companion course lesson reordering endpoints (`PUT` and `POST` `/api/v1/teacher/courses/:courseId/lessons/reorder`) in `TeacherCoursesController` and `lessons.service.ts`.
  - Added 6 regression E2E tests in `phase2-courses-and-learning.e2e-spec.ts`.
- **Sessions Forensic Audit**:
  - Delineated "Authentication Sessions" (`darb_session` HTTP-only signed JWT cookie with 24h expiration, `AuthGuard`, `validateSessionToken`) from "Exam Sitting Sessions" (`ExamAttempt` entity tracking server-side `deadlineAt` and attempt progression).
  - Verified that course/classroom live sessions (e.g. video conferencing / WebRTC) are not part of the MVP specification (explicitly out of scope per Phase 1 charter).
  - Clarified architectural distinction between "Sections" (وحدات وفصول دراسية — fully implemented in Phase 3) and "Sessions".
- **Verification Results**:
  - All 103 E2E tests passing (6/6 test suites).
  - All 19 unit tests passing (4/4 test suites).
  - Total 122/122 automated tests passing.
  - Monorepo linting and TypeScript checks pass with 0 warnings and 0 errors.
  - Phase 6 confirmed as `NOT_STARTED` / ON HOLD.

---

## 2026-10-29 — Phase 5 — P5-001 through P5-004: Multiple-Choice Exams & Automatic Grading

### Summary
- Implemented Phase 5: Multiple-Choice Exams & Automatic Grading following the confirmed repository roadmap.
- Enforced PostgreSQL Row-Level Security on all exam entities: `Exam`, `ExamQuestion`, `ExamAttempt`, `AttemptAnswer`, and `GradeRecord`.
- Added new audit actions: `EXAM_CREATED`, `EXAM_UPDATED`, `EXAM_PUBLISHED`, `EXAM_CLOSED`, `EXAM_ATTEMPT_STARTED`, `EXAM_ATTEMPT_SUBMITTED`, `EXAM_AUTO_GRADED` with migration `20261029131000_add_exam_audit_actions`.
- Created comprehensive shared contracts in `packages/contracts/src/exam.ts` for exam authoring, questions, options, student attempts, real-time answer saving, auto-grading results, and reviews.
- Implemented Teacher Exam Authoring & Management (`TeacherExamsController` & `ExamsService`):
  - Create, edit, draft, publish, close, and soft-delete timed exams.
  - Set duration in minutes (1–300), maximum attempts (1–10), and optional passing score threshold.
  - Question management: add, edit, and delete multiple-choice questions with points and options.
  - Validation: requires at least 2 options and exactly 1 correct answer (`isCorrect: true`) per question.
  - Publish verification: requires at least 1 question with valid options and a marked correct answer.
  - View all student attempt results and scores.
  - Review student attempt answers with correct options and awarded points.
- Implemented Student Exam Taking with Server-Enforced Timer (`StudentExamsController` & `ExamsService`):
  - Start attempt: backend validates published status and attempt limit, sets server-side `startedAt` and `deadlineAt`.
  - Security: `isCorrect` property is strictly stripped from all question options returned to students during active attempts.
  - Real-time incremental answer saving: option selections are saved immediately to `AttemptAnswer` (`saveAnswer`).
  - Server-enforced countdown timer: auto-grades and locks attempts expired past deadline.
  - Attempt locking: finished attempts reject answer modifications or re-submission.
  - Multiple attempts support: tracks remaining attempts and updates `GradeRecord` with the highest score achieved.
- Implemented Automatic Grading Engine:
  - Compares each question's selected option against the designated correct option.
  - Sums up earned points vs total points, computes percentage, and checks passing score cutoff (`isPassed`).
  - Atomic synchronization with `GradeRecord` (`itemType = 'EXAM'`), retaining the student's best attempt score.
  - Post-submission review: reveals correct answers, awarded points, and explanations after submission.
- Developed Arabic RTL Frontend Interfaces:
  - Added "الاختبارات الإلكترونية" tab to Teacher Course Detail page (`TeacherExamsTab`) with exam modal, question authoring modal, and submissions view.
  - Added "الاختبارات الإلكترونية" tab to Student Course Learning page (`StudentExamsView`) with exam taking view, sticky countdown timer bar, question pager, instant score card, and review modal.
- Automated E2E Verification:
  - Created `apps/api/test/phase5-exams-and-auto-grading.e2e-spec.ts` with 20 tests covering authoring, RLS isolation, server-side deadline generation, timer locking, auto-grading calculations, and GradeRecord best score synchronization.
  - 100% test pass rate across monorepo: 97/97 E2E tests, 19/19 unit tests, 0 lint warnings, clean builds.

### Files Changed
- `apps/api/prisma/schema.prisma` — Added new `AuditAction` enum values for exams and attempts.
- `apps/api/prisma/migrations/20261029131000_add_exam_audit_actions/migration.sql` — Applied database migration.
- `packages/contracts/src/exam.ts`, `enums.ts`, `index.ts` — Defined exam DTOs and audit actions.
- `apps/api/src/modules/exams/*` — Created `ExamsModule`, `ExamsService`, `TeacherExamsController`, `StudentExamsController`, and DTOs.
- `apps/api/src/app.module.ts` — Registered `ExamsModule`.
- `apps/web/src/lib/api-client.ts` — Added client methods for exams, questions, attempts, real-time answers, and reviews.
- `apps/web/src/components/teacher/teacher-exams-tab.tsx` — Teacher exam and question management UI.
- `apps/web/src/components/student/student-exams-view.tsx` — Student exam taking, timer, auto-grading, and review UI.
- `apps/web/src/app/(teacher)/teacher/courses/[courseId]/page.tsx` — Integrated exams tab for teachers.
- `apps/web/src/app/(student)/student/courses/[courseId]/page.tsx` — Integrated exams tab for students.
- `apps/api/test/phase5-exams-and-auto-grading.e2e-spec.ts` — 20-test automated E2E test suite for Phase 5.
- `docs/phases/PHASE_5_EXAMS.md` — Completed Phase 5 documentation.
- `TASKS.md`, `PROJECT_MEMORY.md`, `CHANGELOG.md` — Updated project memory and task registry.

---

## 2026-10-29 — Phase 4 — P4-001 through P4-004: Assignments & Manual Grading

### Summary
- Implemented Phase 4: Assignments & Manual Grading on top of the DARB MVP monorepo.
- Integrated `Assignment`, `AssignmentSubmission`, `SubmissionAttachment`, and `GradeRecord` with PostgreSQL Row-Level Security (`assignment_tenant_isolation`, `submission_tenant_isolation`, `submissionattachment_tenant_isolation`, `graderecord_tenant_isolation`).
- Added new audit actions: `ASSIGNMENT_CREATED`, `ASSIGNMENT_UPDATED`, `ASSIGNMENT_PUBLISHED`, `ASSIGNMENT_CLOSED`, `SUBMISSION_CREATED`, `SUBMISSION_GRADED` with migration `20261029123000_add_assignment_audit_actions`.
- Created comprehensive shared contracts in `packages/contracts/src/assignment.ts` for assignments, submissions, file attachments, and grading.
- Implemented Teacher Assignment Management:
  - Create assignment with title, description, max score (validated > 0), and optional due date.
  - Life-cycle management: save as `DRAFT`, `PUBLISHED`, and `CLOSED`.
  - Edit draft and published assignments; closed assignments are immutable.
  - View assignment submissions with student name, username, submission status, submitted text, and attachments.
  - Soft-delete assignments (`deletedAt`).
- Implemented Student Assignment Submissions:
  - List published and closed assignments for enrolled courses with deadlines and max scores.
  - Private S3-compatible attachment upload pipeline (`presignSubmissionFileUpload` & `completeSubmissionFileUpload`) validating MIME types, 25MB limit, and key partitioning `tenants/${tenantId}/assignments/${assignmentId}/students/${studentId}/`.
  - Server-enforced unique constraint on `(assignmentId, studentId)` preventing duplicate submissions.
  - Server-side deadline evaluation: submissions created after `dueDate` are automatically marked `status = LATE`.
  - Grade release policy: student score and feedback are strictly masked (`null`) until the submission status is `GRADED`.
- Implemented Teacher Grading & Feedback Engine:
  - Teacher reviews text answers and downloads student attachments via presigned URL with access controls.
  - Validation: score bounds `0 <= score <= maxScore`.
  - Teacher records score and written feedback; submission status transitions to `GRADED` with `graderId` and timestamp recorded.
  - Atomic upsert into `GradeRecord` (`itemType = 'ASSIGNMENT'`) ensuring synchronized course grades without duplicates.
- Strict Security & Access Controls:
  - Cross-tenant isolation: Teacher Layla cannot access or modify Teacher Ahmed's assignments.
  - Unauthorized teacher cannot grade submissions.
  - Cross-student file download forbidden: Student Sara cannot download Student Tariq's submission attachments.
- Built Arabic RTL Frontend:
  - Added "الواجبات والتكليفات" tab to Teacher Course Detail page (`TeacherAssignmentsTab`) with create/edit modal and submissions review/grading drawer.
  - Added assignments tab to Student Course Learning page (`StudentAssignmentsView`) with submission form, file attachment uploader, submission status, and grade card.
- Comprehensive Automated Tests:
  - Created `apps/api/test/phase4-assignments-and-grading.e2e-spec.ts` with 22 tests covering assignment lifecycle, RLS isolation, duplicate prevention, late status detection, grading bounds, atomic `GradeRecord` upsert, and attachment download permissions.
  - 100% test pass rate across monorepo: 77/77 E2E tests, 19/19 unit tests, 0 lint warnings, clean builds.

### Files Changed
- `apps/api/prisma/schema.prisma` — Added new `AuditAction` enum values for assignments and submissions.
- `apps/api/prisma/migrations/20261029123000_add_assignment_audit_actions/migration.sql` — Applied database migration.
- `packages/contracts/src/assignment.ts`, `enums.ts`, `index.ts` — Defined assignment DTOs and audit actions.
- `apps/api/src/modules/files/files.service.ts` — Added `presignSubmissionFileUpload`, `completeSubmissionFileUpload`, and `presignSubmissionAttachmentDownload`.
- `apps/api/src/modules/assignments/*` — Created `AssignmentsModule`, `AssignmentsService`, `TeacherAssignmentsController`, `StudentAssignmentsController`, and DTOs.
- `apps/api/src/app.module.ts` — Registered `AssignmentsModule`.
- `apps/web/src/lib/api-client.ts` — Added client methods for teacher assignments, student submissions, file presigning, and grading.
- `apps/web/src/components/teacher/teacher-assignments-tab.tsx` — Teacher assignment management & grading drawer.
- `apps/web/src/components/student/student-assignments-view.tsx` — Student assignment view, file uploader, and grades card.
- `apps/web/src/app/(teacher)/teacher/courses/[courseId]/page.tsx` — Integrated assignments tab for teachers.
- `apps/web/src/app/(student)/student/courses/[courseId]/page.tsx` — Integrated assignments tab for students.
- `apps/api/test/phase4-assignments-and-grading.e2e-spec.ts` — 22-test automated E2E test suite for Phase 4.
- `docs/phases/PHASE_4_ASSIGNMENTS_AND_GRADING.md` — Completed Phase 4 documentation.
- `TASKS.md`, `PROJECT_MEMORY.md`, `CHANGELOG.md` — Updated project memory and task registry.

---

## 2026-10-29 — Phase 3 — P3-001 through P3-011: Course Expansion, Worksheets & Rich Content

### Summary
- Implemented Phase 3: Course Expansion, Worksheets & Rich Content on top of the DARB MVP monorepo.
- Extended domain model with `Section` entity (units/sections) and `gradeLevel` metadata on `Course`.
- Applied PostgreSQL Row-Level Security migration `20261029112020_add_sections_and_grade_level` with RLS enabled and forced (`section_tenant_isolation`) and audit actions (`SECTION_CREATED`, `SECTION_UPDATED`, `SECTION_DELETED`).
- Built complete Section Management module (`/api/v1/teacher/courses/:id/sections`, `/api/v1/teacher/sections/:id`, reordering) with automatic order indexing and tenant ownership verification.
- Implemented safe section deletion preserving child lessons: deleting a section detaches lessons safely (`sectionId = null`) without data loss.
- Engineered server-side `ContentSanitizer` utility: strips stored/reflected XSS vectors (`<script>`, inline `on*` event handlers, `javascript:` and dangerous URI protocols) from courses, sections, and lessons while preserving Arabic typography, Markdown structures, and valid external links.
- Hardened private file storage upload completion: strictly validates storage key namespace prefix (`tenants/${tenantId}/lessons/${lessonId}/`), verifies allowed MIME types and extensions, and enforces 25MB limits.
- Hardened file download security: strictly denies student downloads for files attached to unpublished/draft lessons (returns 403 Forbidden).
- Implemented Sectioned Curriculum Student Navigation: returns section hierarchy, lesson section titles, and completion state.
- Developed Rich Markdown Editor (`RichEditor`) for teachers with formatting toolbar (Bold, Italic, H1/H2/H3, Lists, Blockquotes, Code, Links) and a Live RTL Preview tab.
- Developed safe client-side Arabic RTL Markdown Renderer (`MarkdownContent`) without `dangerouslySetInnerHTML`.
- Updated Student Learning view (`/student/courses/[courseId]`) with structured unit accordions, rich markdown lesson reader, worksheet download badges with file sizes, and Previous/Next lesson navigation buttons.
- Automated E2E verification: created `phase3-course-expansion.e2e-spec.ts` with 17 tests verifying section CRUD, RLS isolation, XSS sanitization, upload verification, draft file download denial, and section deletion safety. Total passing E2E tests: 55.

### Files Changed
- `apps/api/prisma/schema.prisma` — Added `Section` model, `sectionId` relation on `Lesson`, `gradeLevel` on `Course`, new `AuditAction` enum values.
- `apps/api/prisma/migrations/20261029112020_add_sections_and_grade_level/migration.sql` — Applied migration with RLS policy.
- `packages/contracts/src/section.ts`, `enums.ts`, `course.ts`, `lesson.ts`, `index.ts` — Added section contracts and updated course/lesson DTOs.
- `apps/api/src/common/utils/content-sanitizer.ts`, `content-sanitizer.spec.ts` — Server-side XSS sanitizer with unit test suite.
- `apps/api/src/modules/sections/*` — `SectionsModule`, `SectionsService`, `TeacherSectionsController`, DTOs.
- `apps/api/src/modules/courses/courses.service.ts` — Included `gradeLevel`, sections list, and sanitization.
- `apps/api/src/modules/lessons/lessons.service.ts`, `teacher-lessons.controller.ts` — Added `sectionId`, sanitization, and soft-delete endpoint.
- `apps/api/src/modules/files/files.service.ts` — Hardened upload key prefix validation and unpublished lesson download block.
- `apps/api/src/modules/learning/learning.service.ts`, `student.controller.ts` — Section curriculum grouping, gradeLevel, and presigned download.
- `apps/web/src/lib/api-client.ts` — Added section API methods and lesson deletion.
- `apps/web/src/components/ui/markdown-content.tsx` — Safe Arabic RTL markdown renderer component.
- `apps/web/src/components/ui/rich-editor.tsx` — Rich markdown editor with toolbar and live preview tab.
- `apps/web/src/app/(teacher)/teacher/courses/[courseId]/page.tsx` — Teacher curriculum units, lesson grouping, rich editor, and worksheets.
- `apps/web/src/app/(student)/student/courses/[courseId]/page.tsx` — Student sectioned navigation, reader, worksheets, next/previous buttons.
- `apps/api/test/phase3-course-expansion.e2e-spec.ts` — Automated 17-test Phase 3 E2E test suite.
- `PROJECT_MEMORY.md`, `CHANGELOG.md`, `TASKS.md` — Updated project memory and task ledger.

---

## 2026-10-29 — Phase 2 — P2-001 through P2-011: Course Management, Join Codes, Student Learning & Admin Provisioning

### Summary
- Implemented Phase 2: Course Management, Secure Cryptographic Join Codes, Student Learning, and Admin Provisioning on top of the DARB MVP monorepo.
- Extended domain model with `CourseStatus` enum (`DRAFT`, `PUBLISHED`, `ARCHIVED`) and added new audit actions for courses, lessons, and join codes.
- Added PostgreSQL RLS bypass migration with transaction-scoped `SET LOCAL app.bypass_rls = 'on'` for trusted administrative and cross-tenant join-code operations, strictly preserving zero-leakage tenant isolation.
- Implemented complete Teacher Course and Lesson management (`/api/v1/teacher/courses`, `/api/v1/teacher/lessons`) with ownership verification, publication controls, and lesson reordering.
- Engineered high-entropy cryptographic join-code engine: `DARB-XXXX-XXXX-XXXX` (64-bit entropy), raw code shown only once to authorized teacher, SHA-256 hash stored in DB, atomic interactive transaction with `SELECT ... FOR UPDATE` locking to strictly prevent over-redemption under high concurrency, generic safe error messages, and IP/user sliding-window rate limiting.
- Implemented Student Learning & Enrollment services (`/api/v1/student/join-courses`, `courses`, `lessons`, `progress`) enforcing active enrollment verification on every request.
- Engineered private file storage abstraction (`StorageProvider`, `LocalStorageProvider`) supporting S3-compatible pre-signed upload URLs with MIME/extension/25MB validation, complete upload linking, and pre-signed download URLs verifying student enrollment.
- Implemented Admin Provisioning endpoints (`/api/v1/admin/teachers`, `students`, `users`, `reset-password`) enabling teacher workspace provisioning, student provisioning without mandatory personal email, account status toggles, and audited password resets.
- Built responsive Arabic RTL Next.js pages:
  - Teacher course management (`/teacher`), course detail, lesson editor, file attachment manager, join code generator with prominent one-time raw code banner, and enrolled student roster (`/teacher/courses/[courseId]`).
  - Student dashboard with instant join-code redemption card, enrolled courses list (`/student`), and course learning reader with file downloads and progress completion toggle (`/student/courses/[courseId]`).
  - Admin management dashboard (`/admin`) with user directory, teacher provisioning tab, student provisioning tab, and audited password reset modal.
- Automated E2E verification: created `phase2-courses-and-learning.e2e-spec.ts` testing course lifecycles, cross-tenant denial, cryptographic join codes, atomic concurrency, student progress, file access authorization, and admin provisioning.

### Files Changed
- `apps/api/prisma/schema.prisma` — Added `CourseStatus`, course status column, new `AuditAction` enum values.
- `apps/api/prisma/migrations/20261029095117_add_course_status/migration.sql` — Migration adding `CourseStatus`.
- `apps/api/prisma/migrations/20261029095835_add_audit_actions/migration.sql` — Migration adding audit actions.
- `apps/api/prisma/migrations/20261029100504_rls_bypass_support/migration.sql` — Migration adding `app.bypass_rls` support to all RLS policies.
- `apps/api/src/database/prisma.service.ts` — Added `withBypassRls()` transaction helper.
- `apps/api/src/modules/auth/auth.module.ts` — Marked `@Global()` for universal guard access.
- `apps/api/src/modules/courses/*` — `CoursesService`, `TeacherCoursesController`, DTOs.
- `apps/api/src/modules/lessons/*` — `LessonsService`, `TeacherLessonsController`, DTOs.
- `apps/api/src/modules/join-codes/*` — `JoinCodesService`, `TeacherJoinCodesController`, DTOs.
- `apps/api/src/modules/learning/*` — `LearningService`, `StudentController`, DTOs.
- `apps/api/src/modules/files/*` — `FilesService`, `TeacherFilesController`, `StorageProvider`, `LocalStorageProvider`.
- `apps/api/src/modules/admin/*` — `AdminService`, `AdminController`, DTOs.
- `apps/api/test/phase2-courses-and-learning.e2e-spec.ts` — 25 comprehensive E2E tests covering Phase 2.
- `packages/contracts/src/*` — Added DTOs and types for courses, lessons, join codes, files, and admin.
- `apps/web/src/lib/api-client.ts` — Added Phase 2 typed API endpoints.
- `apps/web/src/components/ui/empty-state.tsx`, `button.tsx` — Extended component flexibility.
- `apps/web/src/app/(teacher)/teacher/page.tsx` — Teacher course management view.
- `apps/web/src/app/(teacher)/teacher/courses/[courseId]/page.tsx` — Course detail, lesson editor, file uploader, join code manager.
- `apps/web/src/app/(student)/student/page.tsx` — Student dashboard and join code redemption.
- `apps/web/src/app/(student)/student/courses/[courseId]/page.tsx` — Student learning viewer, lesson reader, file downloads, progress toggle.
- `apps/web/src/app/(admin)/admin/page.tsx` — Admin management dashboard, provisioning forms, password reset.
- `PROJECT_MEMORY.md`, `CHANGELOG.md`, `TASKS.md` — Updated project memory and task ledger.

### Database / API Changes
- Applied migrations:
  - `20261029095117_add_course_status`
  - `20261029095835_add_audit_actions`
  - `20261029100504_rls_bypass_support`
- Added REST API endpoints under `/api/v1`:
  - `GET/POST /api/v1/teacher/courses`
  - `GET/PATCH /api/v1/teacher/courses/:id`
  - `POST /api/v1/teacher/courses/:id/publish`
  - `POST /api/v1/teacher/courses/:id/archive`
  - `GET /api/v1/teacher/courses/:id/students`
  - `POST /api/v1/teacher/courses/:courseId/lessons`
  - `PATCH /api/v1/teacher/lessons/:id`
  - `POST /api/v1/teacher/lessons/:id/publish`
  - `POST /api/v1/teacher/lessons/:id/archive`
  - `PUT /api/v1/teacher/courses/:courseId/lessons/reorder`
  - `POST /api/v1/teacher/courses/:courseId/join-codes`
  - `GET /api/v1/teacher/courses/:courseId/join-codes`
  - `POST /api/v1/teacher/join-codes/:id/revoke`
  - `POST /api/v1/teacher/lessons/:id/files/presign-upload`
  - `POST /api/v1/teacher/lessons/:id/files/complete-upload`
  - `DELETE /api/v1/teacher/lessons/:id/files/:fileId`
  - `POST /api/v1/student/join-courses`
  - `GET /api/v1/student/courses`
  - `GET /api/v1/student/courses/:courseId`
  - `GET /api/v1/student/courses/:courseId/lessons`
  - `POST /api/v1/student/lessons/:lessonId/progress`
  - `GET /api/v1/student/files/:fileId/presign-download`
  - `POST /api/v1/admin/teachers`
  - `POST /api/v1/admin/students`
  - `GET /api/v1/admin/users`
  - `PATCH /api/v1/admin/users/:id/status`
  - `POST /api/v1/admin/users/:id/reset-password`

### Tests
- Command: `pnpm --filter @darb/api test:e2e`
- Result: PASS (38/38 tests passing across `phase2-courses-and-learning.e2e-spec.ts`, `health-and-auth.e2e-spec.ts`, `tenant-rls.e2e-spec.ts`)
- Command: `pnpm test`
- Result: PASS (16/16 tests passing across `api` and `web`)
- Command: `pnpm --filter @darb/web build`
- Result: PASS (All 8 Next.js pages successfully compiled and generated)
- Command: `pnpm lint && pnpm typecheck`
- Result: PASS (0 ESLint errors, 0 TypeScript errors)

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
