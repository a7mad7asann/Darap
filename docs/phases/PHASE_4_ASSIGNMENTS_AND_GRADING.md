# Phase 4 Report — Assignments & Grading

- **Phase Objective**: Implement assignment publishing with deadlines, student text/attachment submissions, and teacher manual grading and feedback interfaces.
- **Current Phase Status**: `COMPLETED`
- **Prerequisites**: Phase 3 Courses & Learning
- **Verification**: 22 automated E2E tests in `phase4-assignments-and-grading.e2e-spec.ts`, 77/77 monorepo E2E tests, 19/19 unit tests passing, clean typecheck, clean lint, zero build warnings.

---

## 1. Scope & Acceptance Criteria

| Task ID | Task Description | Acceptance Criteria | Status |
|---|---|---|---|
| `P4-001` | Assignment Creation & Publishing | Teachers create, edit, publish, close, and delete assignments with title, instructions, max score, and optional due dates. Strict cross-tenant isolation enforced. | `COMPLETED` |
| `P4-002` | Student Assignment Submission | Enrolled students submit text and/or file attachments (max 25MB, MIME whitelist, partitioned under `tenants/{tenantId}/assignments/{assignmentId}/students/{studentId}/`). Server-enforced unique constraint `(assignmentId, studentId)` prevents duplicate submission. Submissions past dueDate automatically marked `status = LATE`. Unenrolled students denied. | `COMPLETED` |
| `P4-003` | Teacher Grading & Feedback | Teachers review submissions, record score (0 <= score <= maxScore), provide written feedback, save grader ID and timestamp; atomic upsert of `GradeRecord` (`itemType = 'ASSIGNMENT'`); grade release policy ensures students see grades only when status is `GRADED`. Cross-student attachment download forbidden. | `COMPLETED` |

---

## 2. Work Completed

### Database & Security Enhancements
- Added audit actions in `apps/api/prisma/schema.prisma` and applied migration `20261029123000_add_assignment_audit_actions`:
  - `ASSIGNMENT_CREATED`, `ASSIGNMENT_UPDATED`, `ASSIGNMENT_PUBLISHED`, `ASSIGNMENT_CLOSED`
  - `SUBMISSION_CREATED`, `SUBMISSION_GRADED`
- PostgreSQL Row-Level Security:
  - Enforced existing RLS policies on `Assignment`, `AssignmentSubmission`, `SubmissionAttachment`, and `GradeRecord`.
  - All database queries executed within `withTenant(tenantId, ...)` or explicit bypass queries where tenant context is derived server-side.

### Shared Contracts (`packages/contracts`)
- Created `packages/contracts/src/assignment.ts` with complete TypeScript interfaces:
  - `CreateAssignmentDto`, `UpdateAssignmentDto`, `AssignmentSummaryDto`, `AssignmentDetailDto`
  - `SubmitAssignmentDto`, `GradeSubmissionDto`, `StudentSubmissionDto`, `AssignmentSubmissionSummaryDto`, `SubmissionAttachmentDto`
- Exported from index and compiled cleanly.

### Storage & Files Subsystem (`apps/api/src/modules/files/files.service.ts`)
- `presignSubmissionFileUpload`: validates enrollment, published assignment status, MIME whitelist, 25MB max size, generates key `tenants/${tenantId}/assignments/${assignmentId}/students/${studentId}/${uuidv4()}-${safeName}`.
- `completeSubmissionFileUpload`: verifies storage key matches assignment/student context, verifies object exists in storage, records `FileObject`.
- `presignSubmissionAttachmentDownload`: verifies requester is either the submitting student, the course teacher, or an admin. Strictly denies access to other students or cross-tenant teachers.

### Backend Assignments Module (`apps/api/src/modules/assignments/`)
- `AssignmentsService`:
  - `getTeacherCourseAssignments`: returns assignments with submission and graded counts.
  - `createAssignment`: sanitizes text, validates maxScore > 0, sets status to `DRAFT`.
  - `getTeacherAssignmentDetails`: returns assignment with all student submissions, attachments, scores, and feedback.
  - `updateAssignment`: validates lifecycle (closed assignments cannot be edited).
  - `publishAssignment`: transitions status to `PUBLISHED` and records audit log.
  - `closeAssignment`: transitions status to `CLOSED` and stops student submissions.
  - `deleteAssignment`: soft-deletes assignment with `deletedAt`.
  - `gradeSubmission`: validates score bounds (`0 <= score <= maxScore`), sets status `GRADED`, sets `graderId` and `gradedAt`, and atomically upserts `GradeRecord`.
  - `getStudentCourseAssignments` & `getStudentAssignmentDetails`: enforces student enrollment; strictly masks score and feedback until status is `GRADED`.
  - `submitAssignment`: enforces published status, enforces `@@unique([assignmentId, studentId])`, verifies file attachments belonged to this student and tenant, evaluates server-side deadline to assign `LATE` or `SUBMITTED`, records audit log.
- Controllers:
  - `TeacherAssignmentsController` (`/api/v1/teacher`): role-guarded with `RolesGuard`, `TenantGuard`.
  - `StudentAssignmentsController` (`/api/v1/student`): role-guarded with `RolesGuard`, enrollment-checked.

### Frontend Web Applications (`apps/web`)
- API Client (`apps/web/src/lib/api-client.ts`):
  - Complete teacher and student methods for assignments, submissions, file presigning, and grading.
- Teacher Interface:
  - Created `TeacherAssignmentsTab` (`apps/web/src/components/teacher/teacher-assignments-tab.tsx`).
  - Added "الواجبات والتكليفات" tab to Teacher Course Page (`/teacher/courses/[courseId]`).
  - Interactive modals for creating, editing, publishing, closing, and deleting assignments.
  - Submissions review drawer with student list, status badges (`SUBMITTED`, `LATE`, `GRADED`), student answer text, attachment download buttons, and grading form with real-time score validation and feedback saving.
- Student Interface:
  - Created `StudentAssignmentsView` (`apps/web/src/components/student/student-assignments-view.tsx`).
  - Added tab switcher between lessons and assignments on Student Course Learning Page (`/student/courses/[courseId]`).
  - Submission form with text answer input and direct file upload (presign + S3 upload + complete).
  - Submitted state displaying submitted date/time, late status, submitted text, and attachments.
  - Grade and feedback card visible once teacher has graded.

---

## 3. Verification & Automated Tests
- Created `apps/api/test/phase4-assignments-and-grading.e2e-spec.ts`:
  - 22/22 tests passing covering P4-001, P4-002, P4-003.
  - Verified draft -> publish -> close lifecycle.
  - Verified tenant isolation (Teacher Layla cannot access or modify Teacher Ahmed's assignments).
  - Verified student enrollment protection, duplicate submission rejection, late submission detection, and grade masking.
  - Verified teacher grading score boundaries, feedback saving, and atomic `GradeRecord` upsert.
  - Verified student attachment download access control.
- Full Monorepo Verification:
  - `pnpm --filter @darb/api test:e2e`: 5/5 suites passing (77/77 tests).
  - `pnpm test`: 4/4 unit suites passing (19/19 tests).
  - `pnpm typecheck`: 0 errors across `@darb/contracts`, `@darb/api`, `@darb/web`.
  - `pnpm lint`: 0 errors across monorepo.
  - `pnpm build`: all packages built successfully.
