import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction, UserRole } from '@darb/contracts';
import { PrismaService } from '../../database/prisma.service';
import { ContentSanitizer } from '../../common/utils/content-sanitizer';
import { CreateSectionNestDto } from './dto/create-section.dto';
import { UpdateSectionNestDto } from './dto/update-section.dto';
import { ReorderSectionsNestDto } from './dto/reorder-sections.dto';

@Injectable()
export class SectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createSection(
    tenantId: string,
    teacherId: string,
    courseId: string,
    dto: CreateSectionNestDto,
    userRole: UserRole,
  ) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      // 1. Verify parent course belongs to this tenant and teacher under RLS
      const course = await tx.course.findFirst({
        where: { id: courseId, deletedAt: null },
      });

      if (!course) {
        throw new NotFoundException('المقرر الدراسي غير موجود');
      }

      if (userRole !== UserRole.ADMIN && course.teacherId !== teacherId) {
        throw new ForbiddenException('غير مصرح لك بإضافة وحدات لهذا المقرر');
      }

      // 2. Compute order index if not specified
      let orderIndex = dto.orderIndex;
      if (orderIndex === undefined || orderIndex === null) {
        const lastSection = await tx.section.findFirst({
          where: { courseId, deletedAt: null },
          orderBy: { orderIndex: 'desc' },
          select: { orderIndex: true },
        });
        orderIndex = lastSection ? lastSection.orderIndex + 1 : 0;
      }

      // 3. Sanitize inputs
      const title = ContentSanitizer.sanitize(dto.title);
      const description = dto.description ? ContentSanitizer.sanitize(dto.description) : null;

      // 4. Create Section record
      const section = await tx.section.create({
        data: {
          tenantId,
          courseId,
          title,
          description,
          orderIndex,
        },
      });

      // 5. Audit Log
      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: teacherId,
          action: AuditAction.SECTION_CREATED,
          resourceType: 'Section',
          resourceId: section.id,
          details: { courseId, title: section.title },
        },
      });

      return {
        id: section.id,
        courseId: section.courseId,
        title: section.title,
        description: section.description,
        orderIndex: section.orderIndex,
        lessonsCount: 0,
        createdAt: section.createdAt.toISOString(),
      };
    });
  }

  async updateSection(
    tenantId: string,
    teacherId: string,
    sectionId: string,
    dto: UpdateSectionNestDto,
    userRole: UserRole,
  ) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const section = await tx.section.findFirst({
        where: { id: sectionId, deletedAt: null },
        include: { course: true },
      });

      if (!section) {
        throw new NotFoundException('الوحدة التعليمية غير موجودة');
      }

      if (userRole !== UserRole.ADMIN && section.course.teacherId !== teacherId) {
        throw new ForbiddenException('غير مصرح لك بتعديل هذه الوحدة');
      }

      const updated = await tx.section.update({
        where: { id: sectionId },
        data: {
          title: dto.title !== undefined ? ContentSanitizer.sanitize(dto.title) : undefined,
          description:
            dto.description !== undefined
              ? dto.description
                ? ContentSanitizer.sanitize(dto.description)
                : null
              : undefined,
          orderIndex: dto.orderIndex,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: teacherId,
          action: AuditAction.SECTION_UPDATED,
          resourceType: 'Section',
          resourceId: updated.id,
          details: { title: updated.title },
        },
      });

      return {
        id: updated.id,
        courseId: updated.courseId,
        title: updated.title,
        description: updated.description,
        orderIndex: updated.orderIndex,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    });
  }

  async deleteSection(tenantId: string, teacherId: string, sectionId: string, userRole: UserRole) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const section = await tx.section.findFirst({
        where: { id: sectionId, deletedAt: null },
        include: { course: true },
      });

      if (!section) {
        throw new NotFoundException('الوحدة التعليمية غير موجودة');
      }

      if (userRole !== UserRole.ADMIN && section.course.teacherId !== teacherId) {
        throw new ForbiddenException('غير مصرح لك بحذف هذه الوحدة');
      }

      // Detach lessons so they become unsectioned rather than orphaned or deleted
      await tx.lesson.updateMany({
        where: { sectionId },
        data: { sectionId: null },
      });

      // Soft delete section
      const deleted = await tx.section.update({
        where: { id: sectionId },
        data: { deletedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: teacherId,
          action: AuditAction.SECTION_DELETED,
          resourceType: 'Section',
          resourceId: deleted.id,
          details: { courseId: section.courseId, title: section.title },
        },
      });

      return {
        id: deleted.id,
        message: 'تم حذف الوحدة التعليمية بنجاح وإعادة تعيين دروسها إلى دروس عامة بالمقرر',
      };
    });
  }

  async reorderSections(
    tenantId: string,
    teacherId: string,
    courseId: string,
    dto: ReorderSectionsNestDto,
    userRole: UserRole,
  ) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const course = await tx.course.findFirst({
        where: { id: courseId, deletedAt: null },
      });

      if (!course) {
        throw new NotFoundException('المقرر الدراسي غير موجود');
      }

      if (userRole !== UserRole.ADMIN && course.teacherId !== teacherId) {
        throw new ForbiddenException('غير مصرح لك بإعادة ترتيب وحدات هذا المقرر');
      }

      // Verify all sectionIds belong to this course and are active
      const sections = await tx.section.findMany({
        where: {
          id: { in: dto.sectionIds },
          courseId,
          deletedAt: null,
        },
      });

      if (sections.length !== dto.sectionIds.length) {
        throw new BadRequestException(
          'تحتوي القائمة على معرفات وحدات غير صالحة أو تتبع مقررات أخرى',
        );
      }

      // Update order indexes sequentially in transaction
      for (let i = 0; i < dto.sectionIds.length; i++) {
        await tx.section.update({
          where: { id: dto.sectionIds[i] },
          data: { orderIndex: i },
        });
      }

      const reordered = await tx.section.findMany({
        where: { courseId, deletedAt: null },
        orderBy: { orderIndex: 'asc' },
      });

      return reordered.map((s) => ({
        id: s.id,
        courseId: s.courseId,
        title: s.title,
        orderIndex: s.orderIndex,
      }));
    });
  }

  async getCourseSections(tenantId: string, courseId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const course = await tx.course.findFirst({
        where: { id: courseId, deletedAt: null },
      });

      if (!course) {
        throw new NotFoundException('المقرر الدراسي غير موجود');
      }

      const sections = await tx.section.findMany({
        where: { courseId, deletedAt: null },
        orderBy: { orderIndex: 'asc' },
        include: {
          lessons: {
            where: { deletedAt: null },
            orderBy: { orderIndex: 'asc' },
            include: {
              lessonFiles: {
                include: { file: true },
              },
            },
          },
          _count: {
            select: {
              lessons: { where: { deletedAt: null } },
            },
          },
        },
      });

      return sections.map((s) => ({
        id: s.id,
        courseId: s.courseId,
        title: s.title,
        description: s.description,
        orderIndex: s.orderIndex,
        lessonsCount: s._count.lessons,
        createdAt: s.createdAt.toISOString(),
        lessons: s.lessons.map((l) => ({
          id: l.id,
          courseId: l.courseId,
          sectionId: l.sectionId,
          title: l.title,
          content: l.content,
          orderIndex: l.orderIndex,
          isPublished: l.isPublished,
          createdAt: l.createdAt.toISOString(),
          updatedAt: l.updatedAt.toISOString(),
          files: l.lessonFiles.map((lf) => ({
            id: lf.file.id,
            originalName: lf.file.originalName,
            mimeType: lf.file.mimeType,
            byteSize: Number(lf.file.byteSize),
            createdAt: lf.file.createdAt.toISOString(),
          })),
        })),
      }));
    });
  }
}
