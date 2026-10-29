-- AlterEnum
ALTER TYPE "AuditAction" ADD VALUE 'SECTION_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'SECTION_UPDATED';
ALTER TYPE "AuditAction" ADD VALUE 'SECTION_DELETED';

-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "gradeLevel" TEXT;

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "sectionId" UUID;

-- CreateTable
CREATE TABLE "Section" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Section_tenantId_idx" ON "Section"("tenantId");

-- CreateIndex
CREATE INDEX "Section_courseId_idx" ON "Section"("courseId");

-- CreateIndex
CREATE INDEX "Lesson_sectionId_idx" ON "Lesson"("sectionId");

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Apply Row Level Security and FORCE RLS to Section
ALTER TABLE "Section" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Section" FORCE ROW LEVEL SECURITY;
CREATE POLICY section_tenant_isolation ON "Section"
  FOR ALL TO PUBLIC
  USING (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid)
  WITH CHECK (current_setting('app.bypass_rls', true) = 'on' OR "tenantId" = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
