# Phase 5 Report — Multiple-Choice Exams & Automatic Grading

- **Phase Objective**: Implement timed multiple-choice exam authoring, server-enforced countdown deadlines, real-time answer saving, attempt locking, and automatic grading.
- **Current Phase Status**: `COMPLETED`
- **Prerequisites**: Phase 3 Courses & Learning, Phase 4 Assignments & Grading
- **Verification**: 20 automated E2E tests in `phase5-exams-and-auto-grading.e2e-spec.ts`, 97/97 monorepo E2E tests, 19/19 unit tests passing, clean typecheck, clean lint, zero build warnings.

---

## 1. Scope & Acceptance Criteria

| Task ID | Task Description | Acceptance Criteria | Status |
|---|---|---|---|
| `P5-001` | Exam & Question Authoring | Teachers create timed exams with questions, options, point values, duration in minutes, max attempts, and passing score; correct answers hidden from student responses; cross-tenant isolation enforced. | `COMPLETED` |
| `P5-002` | Server-Enforced Exam Timer & Attempt Locking | Student starts attempt; backend sets server-side `deadlineAt`; enforces maximum attempt limits; auto-submits on timeout; strips `isCorrect` from questions payload; locks attempt against answer modifications once finished. | `COMPLETED` |
| `P5-003` | Real-Time Saving & Auto-Grading Engine | Answers saved incrementally in real time; auto-scores completed attempt upon submission; synchronizes best score into `GradeRecord`; reveals correct answers in post-submission review. | `COMPLETED` |

---

## 2. Work Completed

### Database & Security Enhancements
- Added exam audit actions in `apps/api/prisma/schema.prisma` and applied migration `20261029131000_add_exam_audit_actions`:
  - `EXAM_CREATED`, `EXAM_UPDATED`, `EXAM_PUBLISHED`, `EXAM_CLOSED`
  - `EXAM_ATTEMPT_STARTED`, `EXAM_ATTEMPT_SUBMITTED`, `EXAM_AUTO_GRADED`
- PostgreSQL Row-Level Security:
  - Enforced existing RLS policies on `Exam`, `ExamQuestion`, `ExamAttempt`, and `AttemptAnswer`.
  - All queries executed through `withTenant(tenantId, ...)` or explicit server-derived tenant context.

### Shared Contracts (`packages/contracts`)
- Created `packages/contracts/src/exam.ts` with complete TypeScript interfaces:
  - `CreateExamDto`, `UpdateExamDto`, `ExamSummaryDto`, `ExamDetailDto`
  - `CreateQuestionDto`, `UpdateQuestionDto`, `QuestionOptionDto`, `ExamQuestionDto`
  - `StudentExamSummaryDto`, `StudentExamQuestionDto`, `ActiveAttemptDto`, `SaveAnswerDto`, `ExamResultDto`, `AttemptReviewDto`, `ExamAttemptSummaryDto`
- Exported and compiled cleanly via `pnpm --filter @darb/contracts build`.

### Backend Exams Module (`apps/api/src/modules/exams/`)
- `ExamsService`:
  - `getTeacherCourseExams`: returns exams with question counts, total points, and attempt statistics.
  - `createExam`: sanitizes text, validates duration (1-300 mins) and attempts (1-10), sets status `DRAFT`.
  - `getTeacherExamDetails`: returns exam with full questions and options with `isCorrect` indicators for authoring.
  - `updateExam`: validates lifecycle (closed exams immutable).
  - `publishExam`: verifies exam has at least 1 question with valid options and a marked correct answer.
  - `closeExam`: stops new student attempts.
  - `deleteExam`: soft-deletes exam.
  - `createQuestion`, `updateQuestion`, `deleteQuestion`: manages multiple-choice questions with validated single correct answer.
  - `getTeacherExamSubmissions`: lists student attempts with scores, percentages, and pass/fail indicators.
  - `getStudentCourseExams` & `getStudentExamDetails`: enforces active enrollment in published courses; tracks remaining attempts and best scores.
  - `startExamAttempt`: validates published status, verifies attempts limit, checks for existing active attempt, sets server-side `startedAt` and `deadlineAt`.
  - `getActiveAttemptQuestions`: securely strips `isCorrect` from every option in the response; returns remaining seconds and student's saved answers.
  - `saveAnswer`: incrementally saves student selection in real time; checks server timer.
  - `submitExamAttempt`: locks attempt, evaluates each question against correct option, awards points, calculates percentage, determines pass/fail, and atomically upserts best score into `GradeRecord`.
  - `getAttemptReview`: allows post-submission question-by-question review with correct options and awarded points.
- Controllers:
  - `TeacherExamsController` (`/api/v1/teacher`): role-guarded with `RolesGuard`, `TenantGuard`.
  - `StudentExamsController` (`/api/v1/student`): role-guarded with `RolesGuard`, enrollment-checked.

### Frontend Web Applications (`apps/web`)
- API Client (`apps/web/src/lib/api-client.ts`):
  - Added teacher methods for exams, questions, submissions, and attempt reviews.
  - Added student methods for exams, attempt starting, active questions, incremental answer saving, submission, and review.
- Teacher Interface:
  - Created `TeacherExamsTab` (`apps/web/src/components/teacher/teacher-exams-tab.tsx`).
  - Added "الاختبارات الإلكترونية" tab to Teacher Course Detail page (`/teacher/courses/[courseId]`).
  - Interactive modals for exam creation, question authoring with options, and student submissions review.
- Student Interface:
  - Created `StudentExamsView` (`apps/web/src/components/student/student-exams-view.tsx`).
  - Added "الاختبارات الإلكترونية" tab to Student Course Learning page (`/student/courses/[courseId]`).
  - Interactive Exam Taking Mode:
    - Sticky server-synchronized countdown timer with low-time warning.
    - Question pager / navigation controls.
    - Incremental auto-saving of answers upon option selection.
    - "إنهاء وتسليم الاختبار" with unanswered questions alert.
    - Auto-submit when countdown timer reaches zero.
  - Instant score card with pass/fail badge, score / total points, and percentage.
  - Question-by-question review modal highlighting correct answers.

---

## 3. Verification & Automated Tests
- Created `apps/api/test/phase5-exams-and-auto-grading.e2e-spec.ts`:
  - 20/20 tests passing covering P5-001, P5-002, P5-003.
  - Verified draft -> publish -> close lifecycle.
  - Verified tenant isolation (Teacher Layla cannot access or modify Teacher Ahmed's exams).
  - Verified question option constraints (at least 2 options, exactly 1 correct option).
  - Verified student enrollment protection, server-side `deadlineAt` generation, and security stripping of `isCorrect`.
  - Verified real-time answer saving, auto-grading calculation, atomic `GradeRecord` synchronization, and multiple attempts (best score retention).
  - Verified attempt locking against modifications and enforcement of maximum attempt limits.
- Full Monorepo Verification:
  - `pnpm --filter @darb/api test:e2e`: 6/6 suites passing (97/97 tests).
  - `pnpm test`: 4/4 unit suites passing (19/19 tests).
  - `pnpm typecheck`: 0 errors across `@darb/contracts`, `@darb/api`, `@darb/web`.
  - `pnpm lint`: 0 errors across monorepo.
  - `pnpm build`: all packages built successfully.
