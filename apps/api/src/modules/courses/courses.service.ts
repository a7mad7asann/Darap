import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CourseStatus, AuditAction, UserRole } from '@darb/contracts';
import { PrismaService } from '../../database/prisma.service';
import { CreateCourseNestDto } from './dto/create-course.dto';
import { UpdateCourseNestDto } from './dto/update-course.dto';

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async getTeacherCourses(tenantId: string, teacherId: string, userRole: UserRole) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const whereClause: any = {
        deletedAt: null,
      };

      if (userRole !== UserRole.ADMIN) {
        whereClause.teacherId = teacherId;
      }

      const courses = await tx.course.findMany({
        where: whereClause,
        include: {
          _count: {
            select: {
              lessons: { where: { deletedAt: null } },
              enrollments: { where: { deletedAt: null, status: 'ACTIVE' } },
            },
          },
          teacher: {
            select: {
              displayName: true,
              username: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return courses.map((c) => ({
        id: c.id,
        tenantId: c.tenantId,
        teacherId: c.teacherId,
        teacherName: c.teacher.displayName,
        title: c.title,
        description: c.description,
        subject: c.subject,
        status: c.status as CourseStatus,
        isActive: c.isActive,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
        lessonsCount: c._count.lessons,
        enrolledCount: c._count.enrollments,
      }));
    });
  }

  async getTeacherCourseById(
    tenantId: string,
    teacherId: string,
    courseId: string,
    userRole: UserRole,
  ) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const course = await tx.course.findFirst({
        where: {
          id: courseId,
          deletedAt: null,
        },
        include: {
          teacher: {
            select: {
              displayName: true,
              username: true,
            },
          },
          lessons: {
            where: { deletedAt: null },
            orderBy: { orderIndex: 'asc' },
            include: {
              lessonFiles: {
                include: {
                  file: true,
                },
              },
            },
          },
          enrollments: {
            where: { deletedAt: null, status: 'ACTIVE' },
            include: {
              student: {
                select: {
                  id: true,
                  username: true,
                  displayName: true,
                },
              },
            },
            orderBy: { enrolledAt: 'desc' },
          },
        },
      });

      if (!course) {
        throw new NotFoundException('المقرر الدراسي غير موجود');
      }

      if (userRole !== UserRole.ADMIN && course.teacherId !== teacherId) {
        throw new ForbiddenException('غير مصرح لك بالوصول إلى بيانات هذا المقرر');
      }

      return {
        id: course.id,
        tenantId: course.tenantId,
        teacherId: course.teacherId,
        teacherName: course.teacher.displayName,
        title: course.title,
        description: course.description,
        subject: course.subject,
        status: course.status as CourseStatus,
        isActive: course.isActive,
        createdAt: course.createdAt.toISOString(),
        updatedAt: course.updatedAt.toISOString(),
        lessons: course.lessons.map((l) => ({
          id: l.id,
          courseId: l.courseId,
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
        enrolledStudents: course.enrollments.map((e) => ({
          studentId: e.student.id,
          username: e.student.username,
          displayName: e.student.displayName,
          enrolledAt: e.enrolledAt.toISOString(),
        })),
      };
    });
  }

  async createCourse(tenantId: string, teacherId: string, dto: CreateCourseNestDto) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const course = await tx.course.create({
        data: {
          tenantId,
          teacherId,
          title: dto.title.trim(),
          description: dto.description?.trim() || null,
          subject: dto.subject?.trim() || null,
          status: CourseStatus.DRAFT,
          isActive: true,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: teacherId,
          action: AuditAction.COURSE_CREATED,
          resourceType: 'Course',
          resourceId: course.id,
          details: { title: course.title },
        },
      });

      return {
        id: course.id,
        tenantId: course.tenantId,
        teacherId: course.teacherId,
        title: course.title,
        description: course.description,
        subject: course.subject,
        status: course.status as CourseStatus,
        isActive: course.isActive,
        createdAt: course.createdAt.toISOString(),
        updatedAt: course.updatedAt.toISOString(),
      };
    });
  }

  async updateCourse(
    tenantId: string,
    teacherId: string,
    courseId: string,
    dto: UpdateCourseNestDto,
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
        throw new ForbiddenException('غير مصرح لك بتعديل هذا المقرر');
      }

      if (course.status === CourseStatus.ARCHIVED) {
        throw new BadRequestException('لا يمكن تعديل مقرر مؤرشف');
      }

      const updated = await tx.course.update({
        where: { id: courseId },
        data: {
          title: dto.title !== undefined ? dto.title.trim() : undefined,
          description: dto.description !== undefined ? dto.description?.trim() || null : undefined,
          subject: dto.subject !== undefined ? dto.subject?.trim() || null : undefined,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: teacherId,
          action: AuditAction.COURSE_UPDATED,
          resourceType: 'Course',
          resourceId: updated.id,
          details: { title: updated.title },
        },
      });

      return {
        id: updated.id,
        tenantId: updated.tenantId,
        teacherId: updated.teacherId,
        title: updated.title,
        description: updated.description,
        subject: updated.subject,
        status: updated.status as CourseStatus,
        isActive: updated.isActive,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    });
  }

  async publishCourse(tenantId: string, teacherId: string, courseId: string, userRole: UserRole) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const course = await tx.course.findFirst({
        where: { id: courseId, deletedAt: null },
      });

      if (!course) {
        throw new NotFoundException('المقرر الدراسي غير موجود');
      }

      if (userRole !== UserRole.ADMIN && course.teacherId !== teacherId) {
        throw new ForbiddenException('غير مصرح لك بنشر هذا المقرر');
      }

      if (!course.title || course.title.trim().length < 3) {
        throw new BadRequestException('لا يمكن نشر مقرر بدون عنوان واضح يتكون من 3 أحرف على الأقل');
      }

      const published = await tx.course.update({
        where: { id: courseId },
        data: {
          status: CourseStatus.PUBLISHED,
          isActive: true,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: teacherId,
          action: AuditAction.COURSE_PUBLISHED,
          resourceType: 'Course',
          resourceId: published.id,
          details: { title: published.title },
        },
      });

      return {
        id: published.id,
        status: published.status as CourseStatus,
        isActive: published.isActive,
        message: 'تم نشر المقرر الدراسي بنجاح وأصبح متاحاً للطلاب',
      };
    });
  }

  async archiveCourse(tenantId: string, teacherId: string, courseId: string, userRole: UserRole) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const course = await tx.course.findFirst({
        where: { id: courseId, deletedAt: null },
      });

      if (!course) {
        throw new NotFoundException('المقرر الدراسي غير موجود');
      }

      if (userRole !== UserRole.ADMIN && course.teacherId !== teacherId) {
        throw new ForbiddenException('غير مصرح لك بأرشفة هذا المقرر');
      }

      const archived = await tx.course.update({
        where: { id: courseId },
        data: {
          status: CourseStatus.ARCHIVED,
          isActive: false,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: teacherId,
          action: AuditAction.COURSE_ARCHIVED,
          resourceType: 'Course',
          resourceId: archived.id,
          details: { title: archived.title },
        },
      });

      return {
        id: archived.id,
        status: archived.status as CourseStatus,
        isActive: archived.isActive,
        message: 'تمت أرشفة المقرر الدراسي بنجاح',
      };
    });
  }
}
