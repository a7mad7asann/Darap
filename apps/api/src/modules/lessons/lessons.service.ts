import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditAction, UserRole } from '@darb/contracts';
import { PrismaService } from '../../database/prisma.service';
import { CreateLessonNestDto } from './dto/create-lesson.dto';
import { UpdateLessonNestDto } from './dto/update-lesson.dto';
import { ReorderLessonsNestDto } from './dto/reorder-lesson.dto';

@Injectable()
export class LessonsService {
  constructor(private readonly prisma: PrismaService) {}

  async createLesson(
    tenantId: string,
    teacherId: string,
    courseId: string,
    dto: CreateLessonNestDto,
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
        throw new ForbiddenException('غير مصرح لك بإضافة دروس إلى هذا المقرر');
      }

      let order = dto.orderIndex;
      if (order === undefined || order === null) {
        const lastLesson = await tx.lesson.findFirst({
          where: { courseId, deletedAt: null },
          orderBy: { orderIndex: 'desc' },
        });
        order = lastLesson ? lastLesson.orderIndex + 1 : 0;
      }

      const lesson = await tx.lesson.create({
        data: {
          tenantId,
          courseId,
          title: dto.title.trim(),
          content: dto.content?.trim() || null,
          orderIndex: order,
          isPublished: false,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: teacherId,
          action: AuditAction.LESSON_CREATED,
          resourceType: 'Lesson',
          resourceId: lesson.id,
          details: { title: lesson.title, courseId },
        },
      });

      return {
        id: lesson.id,
        courseId: lesson.courseId,
        title: lesson.title,
        content: lesson.content,
        orderIndex: lesson.orderIndex,
        isPublished: lesson.isPublished,
        createdAt: lesson.createdAt.toISOString(),
        updatedAt: lesson.updatedAt.toISOString(),
        files: [],
      };
    });
  }

  async updateLesson(
    tenantId: string,
    teacherId: string,
    lessonId: string,
    dto: UpdateLessonNestDto,
    userRole: UserRole,
  ) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const lesson = await tx.lesson.findFirst({
        where: { id: lessonId, deletedAt: null },
        include: { course: true },
      });

      if (!lesson) {
        throw new NotFoundException('الدرس غير موجود');
      }

      if (userRole !== UserRole.ADMIN && lesson.course.teacherId !== teacherId) {
        throw new ForbiddenException('غير مصرح لك بتعديل هذا الدرس');
      }

      const updated = await tx.lesson.update({
        where: { id: lessonId },
        data: {
          title: dto.title !== undefined ? dto.title.trim() : undefined,
          content: dto.content !== undefined ? dto.content?.trim() || null : undefined,
          orderIndex: dto.orderIndex !== undefined ? dto.orderIndex : undefined,
        },
      });

      return {
        id: updated.id,
        courseId: updated.courseId,
        title: updated.title,
        content: updated.content,
        orderIndex: updated.orderIndex,
        isPublished: updated.isPublished,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    });
  }

  async publishLesson(tenantId: string, teacherId: string, lessonId: string, userRole: UserRole) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const lesson = await tx.lesson.findFirst({
        where: { id: lessonId, deletedAt: null },
        include: { course: true },
      });

      if (!lesson) {
        throw new NotFoundException('الدرس غير موجود');
      }

      if (userRole !== UserRole.ADMIN && lesson.course.teacherId !== teacherId) {
        throw new ForbiddenException('غير مصرح لك بنشر هذا الدرس');
      }

      const published = await tx.lesson.update({
        where: { id: lessonId },
        data: { isPublished: true },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: teacherId,
          action: AuditAction.LESSON_PUBLISHED,
          resourceType: 'Lesson',
          resourceId: published.id,
          details: { title: published.title },
        },
      });

      return {
        id: published.id,
        isPublished: published.isPublished,
        message: 'تم نشر الدرس بنجاح للطلاب',
      };
    });
  }

  async archiveLesson(tenantId: string, teacherId: string, lessonId: string, userRole: UserRole) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const lesson = await tx.lesson.findFirst({
        where: { id: lessonId, deletedAt: null },
        include: { course: true },
      });

      if (!lesson) {
        throw new NotFoundException('الدرس غير موجود');
      }

      if (userRole !== UserRole.ADMIN && lesson.course.teacherId !== teacherId) {
        throw new ForbiddenException('غير مصرح لك بإلغاء نشر هذا الدرس');
      }

      const archived = await tx.lesson.update({
        where: { id: lessonId },
        data: { isPublished: false },
      });

      return {
        id: archived.id,
        isPublished: archived.isPublished,
        message: 'تم إلغاء نشر الدرس',
      };
    });
  }

  async reorderLessons(
    tenantId: string,
    teacherId: string,
    lessonId: string,
    dto: ReorderLessonsNestDto,
    userRole: UserRole,
  ) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const targetLesson = await tx.lesson.findFirst({
        where: { id: lessonId, deletedAt: null },
        include: { course: true },
      });

      if (!targetLesson) {
        throw new NotFoundException('الدرس المستهدف غير موجود');
      }

      if (userRole !== UserRole.ADMIN && targetLesson.course.teacherId !== teacherId) {
        throw new ForbiddenException('غير مصرح لك بإعادة ترتيب دروس هذا المقرر');
      }

      const courseId = targetLesson.courseId;

      for (let i = 0; i < dto.lessonIds.length; i++) {
        const id = dto.lessonIds[i];
        await tx.lesson.updateMany({
          where: { id, courseId },
          data: { orderIndex: i },
        });
      }

      const reordered = await tx.lesson.findMany({
        where: { courseId, deletedAt: null },
        orderBy: { orderIndex: 'asc' },
      });

      return reordered.map((l) => ({
        id: l.id,
        title: l.title,
        orderIndex: l.orderIndex,
      }));
    });
  }
}
