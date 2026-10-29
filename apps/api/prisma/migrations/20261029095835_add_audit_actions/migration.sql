-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'COURSE_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'COURSE_PUBLISHED';
ALTER TYPE "AuditAction" ADD VALUE 'COURSE_ARCHIVED';
ALTER TYPE "AuditAction" ADD VALUE 'LESSON_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'LESSON_PUBLISHED';
ALTER TYPE "AuditAction" ADD VALUE 'JOIN_CODE_REVOKED';
