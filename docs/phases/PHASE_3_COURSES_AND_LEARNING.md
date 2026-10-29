# Phase 3 Report — Course Expansion, Worksheets & Rich Content

- **Phase Objective**: Enhance course and curriculum organization with units/sections, rich markdown authoring with live RTL preview, server-side stored XSS protection, hardened object storage key verification, download security enforcing published-lesson checks, and an enhanced sectioned student learning experience.
- **Current Phase Status**: `COMPLETED & TESTED`
- **Completion Date**: 2026-10-29
- **Prerequisites**: Phase 1 Foundation, Phase 2 Auth, Courses & Tenancy

---

## 1. Verified Scope & Implementation Matrix

| Task ID | Component | Implementation Summary | Status |
|---|---|---|---|
| `P3-001` | Course Metadata & Grade Level | Added `gradeLevel` column to `Course` model, contracts DTOs, and UI badges. | `TESTED` |
| `P3-002` | Section Domain Entity & RLS | Created `Section` model, applied PostgreSQL migration `20261029112020_add_sections_and_grade_level`, enabled and forced `section_tenant_isolation` RLS policy. | `TESTED` |
| `P3-003` | Backend Sections Module | Implemented `SectionsModule`, `SectionsService`, and `TeacherSectionsController` under `/api/v1/teacher` for CRUD and reordering with tenant RLS scoping. | `TESTED` |
| `P3-004` | Content Sanitization & XSS Protection | Created server-side `ContentSanitizer` utility stripping script tags, event handlers (`onerror=`), and `javascript:` URIs while preserving Arabic typography, Markdown, and valid links. | `TESTED` |
| `P3-005` | Hardened Object Storage Uploads | Enforced storage key namespace prefix check (`tenants/${tenantId}/lessons/${lessonId}/`), MIME whitelist, and 25MB limits during upload completion. | `TESTED` |
| `P3-006` | Strict Download Security | Hardened `presignStudentDownload` to verify student enrollment, course publication, AND that the parent lesson is published (`isPublished === true`). Draft files denied with 403. | `TESTED` |
| `P3-007` | Safe Section Deletion | Section deletion soft-deletes the section and safely disassociates child lessons (`sectionId = null`), preventing orphan records or content loss. | `TESTED` |
| `P3-008` | Student Sectioned Navigation | Enhanced `LearningService` to group published lessons by units/sections, return section titles, and track progress per lesson. | `TESTED` |
| `P3-009` | Teacher Structured UI & Rich Editor | Built `RichEditor` with markdown formatting toolbar and live Arabic RTL preview tab; built section modals and curriculum organization view. | `TESTED` |
| `P3-010` | Student Curriculum & Reader UI | Built `MarkdownContent` safe client-side renderer, sectioned sidebar accordions, worksheet download cards with file size, and Previous/Next lesson navigation. | `TESTED` |
| `P3-011` | Automated Verification Suite | Created `phase3-course-expansion.e2e-spec.ts` with 17 tests verifying all Phase 3 capabilities and security controls. Total 55 E2E tests passing. | `TESTED` |

---

## 2. Key Architectural Decisions & Security Findings

### 2.1 Server-Side Stored XSS Neutralization
- To prevent stored and reflected XSS while allowing teachers to format rich educational content, `ContentSanitizer` executes on all course titles/descriptions, section titles/descriptions, and lesson titles/contents before persisting to PostgreSQL.
- Neutralizes: `<script>`, `<iframe\>`, `<object>`, `<embed>`, inline event handlers (`onload=`, `onerror=`, `onclick=`, etc.), and protocol-relative / javascript URIs (`javascript:`, `vbscript:`, `data:`).
- Preserves: Arabic typography and diacritics, Markdown headings (`#`, `##`, `###`), lists (`-`, `1.`), blockquotes (`>`), bold (`**`), italic (`*`), inline code, and valid HTTPS URLs.

### 2.2 Storage Upload Namespace Hardening
- Previously, `completeLessonFileUpload` verified file existence but did not strictly validate that the client-supplied `storageKey` matched the authenticated tenant and lesson path.
- In Phase 3, the backend strictly asserts `storageKey.startsWith('tenants/' + tenantId + '/lessons/' + lessonId + '/')`. Any spoofed or cross-tenant storage key is rejected with a 400 Bad Request.

### 2.3 Strict Download Denial on Unpublished Lesson Files
- In Phase 2, `presignStudentDownload` verified course enrollment and course publication, but did not check if the individual lesson was published.
- In Phase 3, `presignStudentDownload` strictly checks `lesson.isPublished === true && !lesson.deletedAt`. Students attempting to download files from draft lessons receive a 403 Forbidden response.

### 2.4 Safe Section Deletion Semantics
- When a teacher deletes a section, child lessons attached to that section are NOT cascade-deleted.
- Instead, the backend sets `sectionId = null` on all child lessons, moving them safely to the unsectioned ("دروس عامة") container of the course.

---

## 3. Database Migration Summary

Migration: `20261029112020_add_sections_and_grade_level`
- Tables added: `Section` (`id UUID`, `tenantId UUID`, `courseId UUID`, `title`, `description`, `orderIndex INT`, `createdAt`, `updatedAt`, `deletedAt`).
- Columns added: `Course.gradeLevel VARCHAR`, `Lesson.sectionId UUID`.
- PostgreSQL RLS:
  ```sql
  ALTER TABLE "Section" ENABLE ROW LEVEL SECURITY;
  ALTER TABLE "Section" FORCE ROW LEVEL SECURITY;
  CREATE POLICY section_tenant_isolation ON "Section"
    FOR ALL
    USING (
      (current_setting('app.bypass_rls', true) = 'on')
      OR
      ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    )
    WITH CHECK (
      (current_setting('app.bypass_rls', true) = 'on')
      OR
      ("tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
    );
  ```

---

## 4. Test Verification Results

- **Unit Tests**: 19 / 19 passed (`@darb/api`, `@darb/web`).
- **E2E Tests**: 55 / 55 passed (`phase3-course-expansion.e2e-spec.ts` [17 tests], `phase2-courses-and-learning.e2e-spec.ts` [25 tests], `tenant-rls.e2e-spec.ts` [6 tests], `health-and-auth.e2e-spec.ts` [7 tests]).
- **Linter**: 0 warnings, 0 errors across all monorepo packages.
- **TypeScript**: 0 type errors across all monorepo packages.
- **Build**: Production build passed for `@darb/contracts`, `@darb/api`, and `@darb/web` (all 8 static/dynamic routes compiled).
