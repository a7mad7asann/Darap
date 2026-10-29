import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { CourseStatus, EnrollmentStatus } from '@darb/contracts';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class LearningService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to verify that student has an active enrollment in the specified course
   */
  async verifyStudentEnrollment(studentId: string, courseId: string) {
    const enrollment = await this.prisma.withBypassRls(async (tx) => {
      return tx.enrollment.findFirst({
        where: {
          studentId,
          courseId,
          status: EnrollmentStatus.ACTIVE,
          deletedAt: null,
        },
        include: {
          course: true,
        },
      });
    });

    if (
      !enrollment ||
      enrollment.course.deletedAt ||
      enrollment.course.status !== CourseStatus.PUBLISHED
    ) {
      throw new ForbiddenException(
        'غير مصرح لك بالوصول: أنت لست مسجلاً في هذا المقرر الدراسي أو أنه غير متاح',
      );
    }

    return enrollment;
  }

  async getStudentEnrolledCourses(studentId: string) {
    const enrollments = await this.prisma.withBypassRls(async (tx) => {
      return tx.enrollment.findMany({
        where: {
          studentId,
          status: EnrollmentStatus.ACTIVE,
          deletedAt: null,
          course: {
            deletedAt: null,
            status: CourseStatus.PUBLISHED,
            isActive: true,
          },
        },
        include: {
          course: {
            include: {
              teacher: {
                select: {
                  displayName: true,
                },
              },
              _count: {
                select: {
                  lessons: { where: { isPublished: true, deletedAt: null } },
                },
              },
            },
          },
        },
        orderBy: { enrolledAt: 'desc' },
      });
    });

    return enrollments.map((e) => ({
      enrollmentId: e.id,
      courseId: e.course.id,
      title: e.course.title,
      description: e.course.description,
      subject: e.course.subject,
      gradeLevel: e.course.gradeLevel,
      teacherName: e.course.teacher.displayName,
      enrolledAt: e.enrolledAt.toISOString(),
      lessonsCount: e.course._count.lessons,
    }));
  }

  async getStudentCourseDetails(studentId: string, courseId: string) {
    const enrollment = await this.verifyStudentEnrollment(studentId, courseId);

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        teacher: {
          select: { displayName: true },
        },
        tenant: {
          select: { name: true, slug: true },
        },
        sections: {
          where: { deletedAt: null },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('المقرر الدراسي غير موجود');
    }

    return {
      courseId: course.id,
      title: course.title,
      description: course.description,
      subject: course.subject,
      gradeLevel: course.gradeLevel,
      teacherName: course.teacher.displayName,
      academyName: course.tenant.name,
      enrolledAt: enrollment.enrolledAt.toISOString(),
      sections: course.sections.map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        orderIndex: s.orderIndex,
      })),
    };
  }

  async getStudentCourseLessons(studentId: string, courseId: string) {
    const enrollment = await this.verifyStudentEnrollment(studentId, courseId);

    // Retrieve published lessons under RLS for this tenant
    return this.prisma.withTenant(enrollment.tenantId, async (tx) => {
      const lessons = await tx.lesson.findMany({
        where: {
          courseId,
          isPublished: true,
          deletedAt: null,
        },
        orderBy: { orderIndex: 'asc' },
        include: {
          section: {
            select: {
              id: true,
              title: true,
              orderIndex: true,
            },
          },
          lessonFiles: {
            include: {
              file: true,
            },
          },
          progresses: {
            where: {
              studentId,
            },
          },
        },
      });

      return lessons.map((l) => ({
        id: l.id,
        courseId: l.courseId,
        sectionId: l.sectionId,
        sectionTitle: l.section?.title || null,
        title: l.title,
        content: l.content,
        orderIndex: l.orderIndex,
        createdAt: l.createdAt.toISOString(),
        isCompleted: l.progresses.length > 0 ? l.progresses[0].isCompleted : false,
        completedAt:
          l.progresses.length > 0 && l.progresses[0].completedAt
            ? l.progresses[0].completedAt.toISOString()
            : null,
        files: l.lessonFiles.map((lf) => ({
          id: lf.file.id,
          originalName: lf.file.originalName,
          mimeType: lf.file.mimeType,
          byteSize: Number(lf.file.byteSize),
          createdAt: lf.file.createdAt.toISOString(),
        })),
      }));
    });
  }

  async markLessonProgress(studentId: string, lessonId: string, isCompleted: boolean = true) {
    // 1. Find lesson and parent course
    const lesson = await this.prisma.withBypassRls(async (tx) => {
      return tx.lesson.findFirst({
        where: { id: lessonId, deletedAt: null, isPublished: true },
        include: { course: true },
      });
    });

    if (!lesson) {
      throw new NotFoundException('الدرس غير موجود أو غير متاح حالياً');
    }

    // 2. Strictly verify student is actively enrolled in the lesson's course
    await this.verifyStudentEnrollment(studentId, lesson.courseId);

    // 3. Update or create lesson progress record within tenant RLS
    return this.prisma.withTenant(lesson.tenantId, async (tx) => {
      const progress = await tx.lessonProgress.upsert({
        where: {
          lessonId_studentId: {
            lessonId,
            studentId,
          },
        },
        update: {
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
        },
        create: {
          tenantId: lesson.tenantId,
          lessonId,
          studentId,
          isCompleted,
          completedAt: isCompleted ? new Date() : null,
        },
      });

      return {
        lessonId: progress.lessonId,
        isCompleted: progress.isCompleted,
        completedAt: progress.completedAt ? progress.completedAt.toISOString() : null,
      };
    });
  }
}
