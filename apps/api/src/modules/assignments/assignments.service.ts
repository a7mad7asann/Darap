import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssignmentStatus,
  AuditAction,
  CourseStatus,
  EnrollmentStatus,
  SubmissionStatus,
  UserRole,
} from '@darb/contracts';
import { PrismaService } from '../../database/prisma.service';
import { ContentSanitizer } from '../../common/utils/content-sanitizer';
import { CreateAssignmentNestDto } from './dto/create-assignment.dto';
import { UpdateAssignmentNestDto } from './dto/update-assignment.dto';
import { SubmitAssignmentNestDto } from './dto/submit-assignment.dto';
import { GradeSubmissionNestDto } from './dto/grade-submission.dto';

@Injectable()
export class AssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Teacher Operations (P4-001 & P4-003)
  // ---------------------------------------------------------------------------

  async getTeacherCourseAssignments(
    tenantId: string,
    teacherId: string,
    courseId: string,
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
        throw new ForbiddenException('غير مصرح لك باستعراض تكليفات هذا المقرر');
      }

      const assignments = await tx.assignment.findMany({
        where: { courseId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              submissions: true,
            },
          },
          submissions: {
            where: { status: SubmissionStatus.GRADED },
            select: { id: true },
          },
        },
      });

      const now = new Date();

      return assignments.map((a) => ({
        id: a.id,
        courseId: a.courseId,
        title: a.title,
        description: a.description,
        maxScore: a.maxScore,
        dueDate: a.dueDate ? a.dueDate.toISOString() : null,
        status: a.status as AssignmentStatus,
        submissionsCount: a._count.submissions,
        gradedCount: a.submissions.length,
        isOverdue: a.dueDate ? now > a.dueDate : false,
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      }));
    });
  }

  async createAssignment(
    tenantId: string,
    teacherId: string,
    courseId: string,
    dto: CreateAssignmentNestDto,
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
        throw new ForbiddenException('غير مصرح لك بإضافة تكليفات لهذا المقرر');
      }

      if (course.status === CourseStatus.ARCHIVED) {
        throw new BadRequestException('لا يمكن إضافة تكليفات إلى مقرر مؤرشف');
      }

      const maxScore =
        dto.maxScore !== undefined && dto.maxScore !== null ? Number(dto.maxScore) : 100;
      if (isNaN(maxScore) || maxScore <= 0) {
        throw new BadRequestException(
          'الدرجة القصوى للتكليف يجب أن تكون رقماً موجباً أكبر من الصفر',
        );
      }

      const sanitizedTitle = ContentSanitizer.sanitize(dto.title.trim());
      const sanitizedDesc = dto.description
        ? ContentSanitizer.sanitize(dto.description.trim())
        : null;

      let dueDate: Date | null = null;
      if (dto.dueDate) {
        dueDate = new Date(dto.dueDate);
        if (isNaN(dueDate.getTime())) {
          throw new BadRequestException('تاريخ الاستحقاق غير صالح');
        }
      }

      const assignment = await tx.assignment.create({
        data: {
          tenantId,
          courseId,
          title: sanitizedTitle,
          description: sanitizedDesc,
          maxScore,
          dueDate,
          status: AssignmentStatus.DRAFT,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: teacherId,
          action: AuditAction.ASSIGNMENT_CREATED,
          resourceType: 'Assignment',
          resourceId: assignment.id,
          details: { title: assignment.title, courseId, maxScore },
        },
      });

      return {
        id: assignment.id,
        courseId: assignment.courseId,
        title: assignment.title,
        description: assignment.description,
        maxScore: assignment.maxScore,
        dueDate: assignment.dueDate ? assignment.dueDate.toISOString() : null,
        status: assignment.status as AssignmentStatus,
        submissionsCount: 0,
        gradedCount: 0,
        createdAt: assignment.createdAt.toISOString(),
        updatedAt: assignment.updatedAt.toISOString(),
      };
    });
  }

  async getTeacherAssignmentDetails(
    tenantId: string,
    teacherId: string,
    assignmentId: string,
    userRole: UserRole,
  ) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const assignment = await tx.assignment.findFirst({
        where: { id: assignmentId, deletedAt: null },
        include: {
          course: true,
          submissions: {
            include: {
              student: {
                select: {
                  id: true,
                  displayName: true,
                  username: true,
                },
              },
              gradedBy: {
                select: {
                  id: true,
                  displayName: true,
                },
              },
              attachments: {
                include: {
                  file: true,
                },
              },
            },
            orderBy: { submittedAt: 'desc' },
          },
        },
      });

      if (!assignment) {
        throw new NotFoundException('التكليف غير موجود');
      }

      if (userRole !== UserRole.ADMIN && assignment.course.teacherId !== teacherId) {
        throw new ForbiddenException('غير مصرح لك بالوصول إلى بيانات هذا التكليف');
      }

      const now = new Date();

      return {
        id: assignment.id,
        courseId: assignment.courseId,
        title: assignment.title,
        description: assignment.description,
        maxScore: assignment.maxScore,
        dueDate: assignment.dueDate ? assignment.dueDate.toISOString() : null,
        status: assignment.status as AssignmentStatus,
        isOverdue: assignment.dueDate ? now > assignment.dueDate : false,
        submissionsCount: assignment.submissions.length,
        gradedCount: assignment.submissions.filter((s) => s.status === SubmissionStatus.GRADED)
          .length,
        createdAt: assignment.createdAt.toISOString(),
        updatedAt: assignment.updatedAt.toISOString(),
        submissions: assignment.submissions.map((s) => ({
          id: s.id,
          assignmentId: s.assignmentId,
          studentId: s.student.id,
          studentName: s.student.displayName,
          studentUsername: s.student.username,
          textContent: s.textContent,
          submittedAt: s.submittedAt.toISOString(),
          status: s.status as SubmissionStatus,
          score: s.score,
          feedback: s.feedback,
          gradedAt: s.gradedAt ? s.gradedAt.toISOString() : null,
          graderName: s.gradedBy ? s.gradedBy.displayName : null,
          attachmentsCount: s.attachments.length,
          attachments: s.attachments.map((att) => ({
            id: att.id,
            fileId: att.file.id,
            originalName: att.file.originalName,
            mimeType: att.file.mimeType,
            byteSize: Number(att.file.byteSize),
            createdAt: att.file.createdAt.toISOString(),
          })),
        })),
      };
    });
  }

  async updateAssignment(
    tenantId: string,
    teacherId: string,
    assignmentId: string,
    dto: UpdateAssignmentNestDto,
    userRole: UserRole,
  ) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const assignment = await tx.assignment.findFirst({
        where: { id: assignmentId, deletedAt: null },
        include: { course: true },
      });

      if (!assignment) {
        throw new NotFoundException('التكليف غير موجود');
      }

      if (userRole !== UserRole.ADMIN && assignment.course.teacherId !== teacherId) {
        throw new ForbiddenException('غير مصرح لك بتعديل هذا التكليف');
      }

      if (assignment.status === AssignmentStatus.CLOSED) {
        throw new BadRequestException('لا يمكن تعديل تكليف مغلق');
      }

      let maxScore: number | undefined;
      if (dto.maxScore !== undefined && dto.maxScore !== null) {
        maxScore = Number(dto.maxScore);
        if (isNaN(maxScore) || maxScore <= 0) {
          throw new BadRequestException(
            'الدرجة القصوى للتكليف يجب أن تكون رقماً موجباً أكبر من الصفر',
          );
        }
      }

      let dueDate: Date | null | undefined;
      if (dto.dueDate !== undefined) {
        if (dto.dueDate === null) {
          dueDate = null;
        } else {
          dueDate = new Date(dto.dueDate);
          if (isNaN(dueDate.getTime())) {
            throw new BadRequestException('تاريخ الاستحقاق غير صالح');
          }
        }
      }

      const sanitizedTitle =
        dto.title !== undefined ? ContentSanitizer.sanitize(dto.title.trim()) : undefined;
      const sanitizedDesc =
        dto.description !== undefined
          ? dto.description
            ? ContentSanitizer.sanitize(dto.description.trim())
            : null
          : undefined;

      const updated = await tx.assignment.update({
        where: { id: assignmentId },
        data: {
          title: sanitizedTitle,
          description: sanitizedDesc,
          maxScore,
          dueDate,
          status: dto.status,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: teacherId,
          action: AuditAction.ASSIGNMENT_UPDATED,
          resourceType: 'Assignment',
          resourceId: updated.id,
          details: { title: updated.title, status: updated.status },
        },
      });

      return {
        id: updated.id,
        courseId: updated.courseId,
        title: updated.title,
        description: updated.description,
        maxScore: updated.maxScore,
        dueDate: updated.dueDate ? updated.dueDate.toISOString() : null,
        status: updated.status as AssignmentStatus,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    });
  }

  async publishAssignment(
    tenantId: string,
    teacherId: string,
    assignmentId: string,
    userRole: UserRole,
  ) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const assignment = await tx.assignment.findFirst({
        where: { id: assignmentId, deletedAt: null },
        include: { course: true },
      });

      if (!assignment) {
        throw new NotFoundException('التكليف غير موجود');
      }

      if (userRole !== UserRole.ADMIN && assignment.course.teacherId !== teacherId) {
        throw new ForbiddenException('غير مصرح لك بنشر هذا التكليف');
      }

      const published = await tx.assignment.update({
        where: { id: assignmentId },
        data: { status: AssignmentStatus.PUBLISHED },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: teacherId,
          action: AuditAction.ASSIGNMENT_PUBLISHED,
          resourceType: 'Assignment',
          resourceId: published.id,
          details: { title: published.title },
        },
      });

      return {
        id: published.id,
        status: published.status as AssignmentStatus,
        message: 'تم نشر التكليف بنجاح للطلاب',
      };
    });
  }

  async closeAssignment(
    tenantId: string,
    teacherId: string,
    assignmentId: string,
    userRole: UserRole,
  ) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const assignment = await tx.assignment.findFirst({
        where: { id: assignmentId, deletedAt: null },
        include: { course: true },
      });

      if (!assignment) {
        throw new NotFoundException('التكليف غير موجود');
      }

      if (userRole !== UserRole.ADMIN && assignment.course.teacherId !== teacherId) {
        throw new ForbiddenException('غير مصرح لك بإغلاق هذا التكليف');
      }

      const closed = await tx.assignment.update({
        where: { id: assignmentId },
        data: { status: AssignmentStatus.CLOSED },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: teacherId,
          action: AuditAction.ASSIGNMENT_CLOSED,
          resourceType: 'Assignment',
          resourceId: closed.id,
          details: { title: closed.title },
        },
      });

      return {
        id: closed.id,
        status: closed.status as AssignmentStatus,
        message: 'تم إغلاق التكليف وإيقاف قبول التسليمات الجديدة',
      };
    });
  }

  async deleteAssignment(
    tenantId: string,
    teacherId: string,
    assignmentId: string,
    userRole: UserRole,
  ) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const assignment = await tx.assignment.findFirst({
        where: { id: assignmentId, deletedAt: null },
        include: { course: true },
      });

      if (!assignment) {
        throw new NotFoundException('التكليف غير موجود');
      }

      if (userRole !== UserRole.ADMIN && assignment.course.teacherId !== teacherId) {
        throw new ForbiddenException('غير مصرح لك بحذف هذا التكليف');
      }

      await tx.assignment.update({
        where: { id: assignmentId },
        data: { deletedAt: new Date() },
      });

      return {
        id: assignment.id,
        message: 'تم حذف التكليف بنجاح',
      };
    });
  }

  async gradeSubmission(
    tenantId: string,
    teacherId: string,
    submissionId: string,
    dto: GradeSubmissionNestDto,
    userRole: UserRole,
  ) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const submission = await tx.assignmentSubmission.findFirst({
        where: { id: submissionId },
        include: {
          assignment: {
            include: { course: true },
          },
          student: {
            select: {
              id: true,
              displayName: true,
              username: true,
            },
          },
          attachments: {
            include: { file: true },
          },
        },
      });

      if (!submission) {
        throw new NotFoundException('التسليم غير موجود');
      }

      if (userRole !== UserRole.ADMIN && submission.assignment.course.teacherId !== teacherId) {
        throw new ForbiddenException('غير مصرح لك بتصحيح تسليمات هذا المقرر');
      }

      const score = Number(dto.score);
      if (isNaN(score) || score < 0 || score > submission.assignment.maxScore) {
        throw new BadRequestException(
          `الدرجة الممنوحة يجب أن تكون بين 0 و ${submission.assignment.maxScore}`,
        );
      }

      const sanitizedFeedback = dto.feedback
        ? ContentSanitizer.sanitize(dto.feedback.trim())
        : null;

      const now = new Date();

      // 1. Update submission record
      const graded = await tx.assignmentSubmission.update({
        where: { id: submissionId },
        data: {
          score,
          feedback: sanitizedFeedback,
          status: SubmissionStatus.GRADED,
          gradedById: teacherId,
          gradedAt: now,
        },
        include: {
          gradedBy: {
            select: { displayName: true },
          },
        },
      });

      // 2. Atomically upsert GradeRecord
      await tx.gradeRecord.upsert({
        where: {
          courseId_studentId_itemType_itemId: {
            courseId: submission.assignment.courseId,
            studentId: submission.studentId,
            itemType: 'ASSIGNMENT',
            itemId: submission.assignment.id,
          },
        },
        update: {
          score,
          maxScore: submission.assignment.maxScore,
          recordedAt: now,
        },
        create: {
          tenantId,
          courseId: submission.assignment.courseId,
          studentId: submission.studentId,
          itemType: 'ASSIGNMENT',
          itemId: submission.assignment.id,
          score,
          maxScore: submission.assignment.maxScore,
          recordedAt: now,
        },
      });

      // 3. Record audit log
      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: teacherId,
          action: AuditAction.SUBMISSION_GRADED,
          resourceType: 'AssignmentSubmission',
          resourceId: submission.id,
          details: {
            assignmentId: submission.assignmentId,
            studentId: submission.studentId,
            score,
            maxScore: submission.assignment.maxScore,
          },
        },
      });

      return {
        id: graded.id,
        assignmentId: graded.assignmentId,
        studentId: graded.studentId,
        studentName: submission.student.displayName,
        studentUsername: submission.student.username,
        textContent: graded.textContent,
        submittedAt: graded.submittedAt.toISOString(),
        status: graded.status as SubmissionStatus,
        score: graded.score,
        feedback: graded.feedback,
        gradedAt: graded.gradedAt ? graded.gradedAt.toISOString() : null,
        graderName: graded.gradedBy ? graded.gradedBy.displayName : null,
        attachmentsCount: submission.attachments.length,
        attachments: submission.attachments.map((att) => ({
          id: att.id,
          fileId: att.file.id,
          originalName: att.file.originalName,
          mimeType: att.file.mimeType,
          byteSize: Number(att.file.byteSize),
          createdAt: att.file.createdAt.toISOString(),
        })),
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Student Operations (P4-002)
  // ---------------------------------------------------------------------------

  private async verifyStudentEnrollment(studentId: string, courseId: string) {
    const enrollment = await this.prisma.withBypassRls(async (tx) => {
      return tx.enrollment.findFirst({
        where: {
          studentId,
          courseId,
          status: EnrollmentStatus.ACTIVE,
          deletedAt: null,
        },
        include: { course: true },
      });
    });

    if (
      !enrollment ||
      enrollment.course.deletedAt ||
      enrollment.course.status !== CourseStatus.PUBLISHED
    ) {
      throw new ForbiddenException('أنت غير مسجل في هذا المقرر الدراسي أو أنه غير متاح للطلاب');
    }

    return enrollment;
  }

  async getStudentCourseAssignments(studentId: string, courseId: string) {
    const enrollment = await this.verifyStudentEnrollment(studentId, courseId);

    return this.prisma.withTenant(enrollment.tenantId, async (tx) => {
      const assignments = await tx.assignment.findMany({
        where: {
          courseId,
          status: { in: [AssignmentStatus.PUBLISHED, AssignmentStatus.CLOSED] },
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
        include: {
          submissions: {
            where: { studentId },
            include: {
              gradedBy: { select: { displayName: true } },
              attachments: { include: { file: true } },
            },
          },
        },
      });

      const now = new Date();

      return assignments.map((a) => {
        const sub = a.submissions.length > 0 ? a.submissions[0] : null;
        const isGraded = sub ? sub.status === SubmissionStatus.GRADED : false;

        return {
          id: a.id,
          courseId: a.courseId,
          title: a.title,
          description: a.description,
          maxScore: a.maxScore,
          dueDate: a.dueDate ? a.dueDate.toISOString() : null,
          status: a.status as AssignmentStatus,
          isOverdue: a.dueDate ? now > a.dueDate : false,
          createdAt: a.createdAt.toISOString(),
          updatedAt: a.updatedAt.toISOString(),
          mySubmission: sub
            ? {
                id: sub.id,
                assignmentId: sub.assignmentId,
                studentId: sub.studentId,
                textContent: sub.textContent,
                submittedAt: sub.submittedAt.toISOString(),
                status: sub.status as SubmissionStatus,
                score: isGraded ? sub.score : null,
                feedback: isGraded ? sub.feedback : null,
                gradedAt: isGraded && sub.gradedAt ? sub.gradedAt.toISOString() : null,
                graderName: isGraded && sub.gradedBy ? sub.gradedBy.displayName : null,
                attachments: sub.attachments.map((att) => ({
                  id: att.id,
                  fileId: att.file.id,
                  originalName: att.file.originalName,
                  mimeType: att.file.mimeType,
                  byteSize: Number(att.file.byteSize),
                  createdAt: att.file.createdAt.toISOString(),
                })),
              }
            : null,
        };
      });
    });
  }

  async getStudentAssignmentDetails(studentId: string, assignmentId: string) {
    const assignment = await this.prisma.withBypassRls(async (tx) => {
      return tx.assignment.findFirst({
        where: {
          id: assignmentId,
          deletedAt: null,
          status: { in: [AssignmentStatus.PUBLISHED, AssignmentStatus.CLOSED] },
        },
        include: { course: true },
      });
    });

    if (!assignment) {
      throw new NotFoundException('التكليف غير موجود أو غير متاح للطلاب حالياً');
    }

    await this.verifyStudentEnrollment(studentId, assignment.courseId);

    return this.prisma.withTenant(assignment.tenantId, async (tx) => {
      const submission = await tx.assignmentSubmission.findFirst({
        where: {
          assignmentId,
          studentId,
        },
        include: {
          gradedBy: { select: { displayName: true } },
          attachments: { include: { file: true } },
        },
      });

      const now = new Date();
      const isGraded = submission ? submission.status === SubmissionStatus.GRADED : false;

      return {
        id: assignment.id,
        courseId: assignment.courseId,
        title: assignment.title,
        description: assignment.description,
        maxScore: assignment.maxScore,
        dueDate: assignment.dueDate ? assignment.dueDate.toISOString() : null,
        status: assignment.status as AssignmentStatus,
        isOverdue: assignment.dueDate ? now > assignment.dueDate : false,
        createdAt: assignment.createdAt.toISOString(),
        updatedAt: assignment.updatedAt.toISOString(),
        mySubmission: submission
          ? {
              id: submission.id,
              assignmentId: submission.assignmentId,
              studentId: submission.studentId,
              textContent: submission.textContent,
              submittedAt: submission.submittedAt.toISOString(),
              status: submission.status as SubmissionStatus,
              score: isGraded ? submission.score : null,
              feedback: isGraded ? submission.feedback : null,
              gradedAt: isGraded && submission.gradedAt ? submission.gradedAt.toISOString() : null,
              graderName: isGraded && submission.gradedBy ? submission.gradedBy.displayName : null,
              attachments: submission.attachments.map((att) => ({
                id: att.id,
                fileId: att.file.id,
                originalName: att.file.originalName,
                mimeType: att.file.mimeType,
                byteSize: Number(att.file.byteSize),
                createdAt: att.file.createdAt.toISOString(),
              })),
            }
          : null,
      };
    });
  }

  async submitAssignment(studentId: string, assignmentId: string, dto: SubmitAssignmentNestDto) {
    const assignment = await this.prisma.withBypassRls(async (tx) => {
      return tx.assignment.findFirst({
        where: { id: assignmentId, deletedAt: null },
        include: { course: true },
      });
    });

    if (!assignment) {
      throw new NotFoundException('التكليف المطلوب غير موجود');
    }

    if (assignment.status !== AssignmentStatus.PUBLISHED) {
      throw new ForbiddenException('لا يمكن تقديم حل لهذا التكليف لأن حالته ليست منشورة');
    }

    await this.verifyStudentEnrollment(studentId, assignment.courseId);

    const textContent = dto.textContent ? ContentSanitizer.sanitize(dto.textContent.trim()) : null;
    const fileIds = dto.fileIds || [];

    if (!textContent && fileIds.length === 0) {
      throw new BadRequestException('يجب تقديم نص الإجابة أو إرفاق ملف حل واحد على الأقل');
    }

    const now = new Date();
    const isLate = assignment.dueDate ? now > assignment.dueDate : false;
    const submissionStatus = isLate ? SubmissionStatus.LATE : SubmissionStatus.SUBMITTED;

    return this.prisma.withTenant(assignment.tenantId, async (tx) => {
      // 1. Strictly enforce unique constraint on (assignmentId, studentId)
      const existing = await tx.assignmentSubmission.findUnique({
        where: {
          assignmentId_studentId: {
            assignmentId,
            studentId,
          },
        },
      });

      if (existing) {
        throw new BadRequestException('لقد قمت بتسليم هذا الواجب مسبقاً، لا يمكن تسليمه مرة أخرى');
      }

      // 2. Verify all attached files exist, belong to this tenant, and were uploaded by this student
      let validFiles: any[] = [];
      if (fileIds.length > 0) {
        validFiles = await tx.fileObject.findMany({
          where: {
            id: { in: fileIds },
            tenantId: assignment.tenantId,
            uploadedById: studentId,
            deletedAt: null,
          },
        });

        if (validFiles.length !== fileIds.length) {
          throw new BadRequestException(
            'تحتوي القائمة على ملفات غير صالحة أو غير مصرح لك بإرفاقها',
          );
        }
      }

      // 3. Create submission record
      const submission = await tx.assignmentSubmission.create({
        data: {
          tenantId: assignment.tenantId,
          assignmentId,
          studentId,
          textContent,
          submittedAt: now,
          status: submissionStatus,
        },
      });

      // 4. Create attachment links
      for (const file of validFiles) {
        await tx.submissionAttachment.create({
          data: {
            tenantId: assignment.tenantId,
            submissionId: submission.id,
            fileId: file.id,
          },
        });
      }

      // 5. Record audit log
      await tx.auditLog.create({
        data: {
          tenantId: assignment.tenantId,
          actorId: studentId,
          action: AuditAction.SUBMISSION_CREATED,
          resourceType: 'AssignmentSubmission',
          resourceId: submission.id,
          details: {
            assignmentId,
            isLate,
            attachmentsCount: validFiles.length,
          },
        },
      });

      return {
        id: submission.id,
        assignmentId: submission.assignmentId,
        studentId: submission.studentId,
        textContent: submission.textContent,
        submittedAt: submission.submittedAt.toISOString(),
        status: submission.status as SubmissionStatus,
        isLate,
        score: null,
        feedback: null,
        gradedAt: null,
        graderName: null,
        attachments: validFiles.map((f) => ({
          id: f.id,
          fileId: f.id,
          originalName: f.originalName,
          mimeType: f.mimeType,
          byteSize: Number(f.byteSize),
          createdAt: f.createdAt.toISOString(),
        })),
      };
    });
  }
}
