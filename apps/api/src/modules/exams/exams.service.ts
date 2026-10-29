import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AttemptStatus,
  AuditAction,
  CourseStatus,
  EnrollmentStatus,
  ExamStatus,
  QuestionType,
  UserRole,
} from '@darb/contracts';
import { PrismaService } from '../../database/prisma.service';
import { ContentSanitizer } from '../../common/utils/content-sanitizer';
import { CreateExamNestDto } from './dto/create-exam.dto';
import { UpdateExamNestDto } from './dto/update-exam.dto';
import { CreateQuestionNestDto } from './dto/create-question.dto';
import { UpdateQuestionNestDto } from './dto/update-question.dto';
import { SaveAnswerNestDto } from './dto/save-answer.dto';

@Injectable()
export class ExamsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Teacher Operations (P5-001)
  // ---------------------------------------------------------------------------

  async getTeacherCourseExams(
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
        throw new ForbiddenException('غير مصرح لك باستعراض اختبارات هذا المقرر');
      }

      const exams = await tx.exam.findMany({
        where: { courseId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: {
          questions: {
            select: { points: true },
          },
          _count: {
            select: { attempts: true },
          },
        },
      });

      return exams.map((exam) => {
        const totalPoints = exam.questions.reduce((sum, q) => sum + Number(q.points), 0);
        return {
          id: exam.id,
          courseId: exam.courseId,
          title: exam.title,
          instructions: exam.instructions,
          durationMinutes: exam.durationMinutes,
          maxAttempts: exam.maxAttempts,
          passingScore: exam.passingScore,
          status: exam.status as ExamStatus,
          questionsCount: exam.questions.length,
          totalPoints,
          attemptsCount: exam._count.attempts,
          createdAt: exam.createdAt.toISOString(),
          updatedAt: exam.updatedAt.toISOString(),
        };
      });
    });
  }

  async createExam(
    tenantId: string,
    teacherId: string,
    courseId: string,
    dto: CreateExamNestDto,
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
        throw new ForbiddenException('غير مصرح لك بإنشاء اختبارات لهذا المقرر');
      }

      if (course.status === CourseStatus.ARCHIVED) {
        throw new BadRequestException('لا يمكن إنشاء اختبار في مقرر مؤرشف');
      }

      const sanitizedTitle = ContentSanitizer.sanitize(dto.title.trim());
      const sanitizedInstructions = dto.instructions
        ? ContentSanitizer.sanitize(dto.instructions.trim())
        : null;

      const durationMinutes = dto.durationMinutes ? Number(dto.durationMinutes) : 60;
      const maxAttempts = dto.maxAttempts ? Number(dto.maxAttempts) : 1;
      const passingScore =
        dto.passingScore !== undefined && dto.passingScore !== null
          ? Number(dto.passingScore)
          : null;

      let startsAt: Date | null = null;
      if (dto.startsAt) {
        startsAt = new Date(dto.startsAt);
        if (isNaN(startsAt.getTime())) {
          throw new BadRequestException('تاريخ بدء الاختبار غير صالح');
        }
      }

      let endsAt: Date | null = null;
      if (dto.endsAt) {
        endsAt = new Date(dto.endsAt);
        if (isNaN(endsAt.getTime())) {
          throw new BadRequestException('تاريخ انتهاء الاختبار غير صالح');
        }
      }

      const exam = await tx.exam.create({
        data: {
          tenantId,
          courseId,
          title: sanitizedTitle,
          instructions: sanitizedInstructions,
          durationMinutes,
          maxAttempts,
          passingScore,
          startsAt,
          endsAt,
          status: ExamStatus.DRAFT,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: teacherId,
          action: AuditAction.EXAM_CREATED,
          resourceType: 'Exam',
          resourceId: exam.id,
          details: { title: exam.title, courseId, durationMinutes, maxAttempts },
        },
      });

      return {
        id: exam.id,
        courseId: exam.courseId,
        title: exam.title,
        instructions: exam.instructions,
        durationMinutes: exam.durationMinutes,
        maxAttempts: exam.maxAttempts,
        passingScore: exam.passingScore,
        status: exam.status as ExamStatus,
        questionsCount: 0,
        totalPoints: 0,
        attemptsCount: 0,
        createdAt: exam.createdAt.toISOString(),
        updatedAt: exam.updatedAt.toISOString(),
      };
    });
  }

  async getTeacherExamDetails(
    tenantId: string,
    teacherId: string,
    examId: string,
    userRole: UserRole,
  ) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const exam = await tx.exam.findFirst({
        where: { id: examId, deletedAt: null },
        include: {
          course: true,
          questions: {
            orderBy: { orderIndex: 'asc' },
            include: {
              options: {
                orderBy: { orderIndex: 'asc' },
              },
            },
          },
          _count: {
            select: { attempts: true },
          },
        },
      });

      if (!exam) {
        throw new NotFoundException('الاختبار غير موجود');
      }

      if (userRole !== UserRole.ADMIN && exam.course.teacherId !== teacherId) {
        throw new ForbiddenException('غير مصرح لك باستعراض بيانات هذا الاختبار');
      }

      const totalPoints = exam.questions.reduce((sum, q) => sum + Number(q.points), 0);

      return {
        id: exam.id,
        courseId: exam.courseId,
        title: exam.title,
        instructions: exam.instructions,
        durationMinutes: exam.durationMinutes,
        maxAttempts: exam.maxAttempts,
        passingScore: exam.passingScore,
        status: exam.status as ExamStatus,
        questionsCount: exam.questions.length,
        totalPoints,
        attemptsCount: exam._count.attempts,
        createdAt: exam.createdAt.toISOString(),
        updatedAt: exam.updatedAt.toISOString(),
        questions: exam.questions.map((q) => ({
          id: q.id,
          examId: q.examId,
          prompt: q.prompt,
          questionType: q.questionType as QuestionType,
          points: Number(q.points),
          orderIndex: q.orderIndex,
          createdAt: q.createdAt.toISOString(),
          options: q.options.map((o) => ({
            id: o.id,
            content: o.content,
            isCorrect: o.isCorrect,
            orderIndex: o.orderIndex,
          })),
        })),
      };
    });
  }

  async updateExam(
    tenantId: string,
    teacherId: string,
    examId: string,
    dto: UpdateExamNestDto,
    userRole: UserRole,
  ) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const exam = await tx.exam.findFirst({
        where: { id: examId, deletedAt: null },
        include: { course: true },
      });

      if (!exam) {
        throw new NotFoundException('الاختبار غير موجود');
      }

      if (userRole !== UserRole.ADMIN && exam.course.teacherId !== teacherId) {
        throw new ForbiddenException('غير مصرح لك بتعديل هذا الاختبار');
      }

      if (exam.status === ExamStatus.CLOSED) {
        throw new BadRequestException('لا يمكن تعديل اختبار مغلق');
      }

      const sanitizedTitle =
        dto.title !== undefined ? ContentSanitizer.sanitize(dto.title.trim()) : undefined;
      const sanitizedInstructions =
        dto.instructions !== undefined
          ? dto.instructions
            ? ContentSanitizer.sanitize(dto.instructions.trim())
            : null
          : undefined;

      const durationMinutes =
        dto.durationMinutes !== undefined ? Number(dto.durationMinutes) : undefined;
      const maxAttempts = dto.maxAttempts !== undefined ? Number(dto.maxAttempts) : undefined;
      const passingScore =
        dto.passingScore !== undefined
          ? dto.passingScore !== null
            ? Number(dto.passingScore)
            : null
          : undefined;

      let startsAt: Date | null | undefined;
      if (dto.startsAt !== undefined) {
        if (dto.startsAt === null) {
          startsAt = null;
        } else {
          startsAt = new Date(dto.startsAt);
          if (isNaN(startsAt.getTime())) {
            throw new BadRequestException('تاريخ بدء الاختبار غير صالح');
          }
        }
      }

      let endsAt: Date | null | undefined;
      if (dto.endsAt !== undefined) {
        if (dto.endsAt === null) {
          endsAt = null;
        } else {
          endsAt = new Date(dto.endsAt);
          if (isNaN(endsAt.getTime())) {
            throw new BadRequestException('تاريخ انتهاء الاختبار غير صالح');
          }
        }
      }

      const updated = await tx.exam.update({
        where: { id: examId },
        data: {
          title: sanitizedTitle,
          instructions: sanitizedInstructions,
          durationMinutes,
          maxAttempts,
          passingScore,
          startsAt,
          endsAt,
          status: dto.status,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: teacherId,
          action: AuditAction.EXAM_UPDATED,
          resourceType: 'Exam',
          resourceId: updated.id,
          details: { title: updated.title, status: updated.status },
        },
      });

      return {
        id: updated.id,
        courseId: updated.courseId,
        title: updated.title,
        instructions: updated.instructions,
        durationMinutes: updated.durationMinutes,
        maxAttempts: updated.maxAttempts,
        passingScore: updated.passingScore,
        status: updated.status as ExamStatus,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    });
  }

  async publishExam(
    tenantId: string,
    teacherId: string,
    examId: string,
    userRole: UserRole,
  ) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const exam = await tx.exam.findFirst({
        where: { id: examId, deletedAt: null },
        include: {
          course: true,
          questions: {
            include: { options: true },
          },
        },
      });

      if (!exam) {
        throw new NotFoundException('الاختبار غير موجود');
      }

      if (userRole !== UserRole.ADMIN && exam.course.teacherId !== teacherId) {
        throw new ForbiddenException('غير مصرح لك بنشر هذا الاختبار');
      }

      if (exam.questions.length === 0) {
        throw new BadRequestException('لا يمكن نشر اختبار لا يحتوي على أسئلة');
      }

      for (const q of exam.questions) {
        if (q.options.length < 2) {
          throw new BadRequestException(`السؤال "${q.prompt}" يجب أن يحتوي على خيارين على الأقل`);
        }
        const hasCorrect = q.options.some((o) => o.isCorrect);
        if (!hasCorrect) {
          throw new BadRequestException(`السؤال "${q.prompt}" لا يحتوي على إجابة صحيحة محددة`);
        }
      }

      const published = await tx.exam.update({
        where: { id: examId },
        data: { status: ExamStatus.PUBLISHED },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: teacherId,
          action: AuditAction.EXAM_PUBLISHED,
          resourceType: 'Exam',
          resourceId: published.id,
          details: { title: published.title },
        },
      });

      return {
        id: published.id,
        status: published.status as ExamStatus,
        message: 'تم نشر الاختبار بنجاح وأصبح متاحاً للطلاب المسجلين',
      };
    });
  }

  async closeExam(
    tenantId: string,
    teacherId: string,
    examId: string,
    userRole: UserRole,
  ) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const exam = await tx.exam.findFirst({
        where: { id: examId, deletedAt: null },
        include: { course: true },
      });

      if (!exam) {
        throw new NotFoundException('الاختبار غير موجود');
      }

      if (userRole !== UserRole.ADMIN && exam.course.teacherId !== teacherId) {
        throw new ForbiddenException('غير مصرح لك بإغلاق هذا الاختبار');
      }

      const closed = await tx.exam.update({
        where: { id: examId },
        data: { status: ExamStatus.CLOSED },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: teacherId,
          action: AuditAction.EXAM_CLOSED,
          resourceType: 'Exam',
          resourceId: closed.id,
          details: { title: closed.title },
        },
      });

      return {
        id: closed.id,
        status: closed.status as ExamStatus,
        message: 'تم إغلاق الاختبار وإيقاف قبول أي محاولات جديدة',
      };
    });
  }

  async deleteExam(
    tenantId: string,
    teacherId: string,
    examId: string,
    userRole: UserRole,
  ) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const exam = await tx.exam.findFirst({
        where: { id: examId, deletedAt: null },
        include: { course: true },
      });

      if (!exam) {
        throw new NotFoundException('الاختبار غير موجود');
      }

      if (userRole !== UserRole.ADMIN && exam.course.teacherId !== teacherId) {
        throw new ForbiddenException('غير مصرح لك بحذف هذا الاختبار');
      }

      await tx.exam.update({
        where: { id: examId },
        data: { deletedAt: new Date() },
      });

      return {
        id: exam.id,
        message: 'تم حذف الاختبار بنجاح',
      };
    });
  }

  // --- Questions Management ---

  async createQuestion(
    tenantId: string,
    teacherId: string,
    examId: string,
    dto: CreateQuestionNestDto,
    userRole: UserRole,
  ) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const exam = await tx.exam.findFirst({
        where: { id: examId, deletedAt: null },
        include: { course: true, questions: true },
      });

      if (!exam) {
        throw new NotFoundException('الاختبار غير موجود');
      }

      if (userRole !== UserRole.ADMIN && exam.course.teacherId !== teacherId) {
        throw new ForbiddenException('غير مصرح لك بإضافة أسئلة لهذا الاختبار');
      }

      if (exam.status === ExamStatus.CLOSED) {
        throw new BadRequestException('لا يمكن إضافة أسئلة لاختبار مغلق');
      }

      const correctOptions = dto.options.filter((o) => o.isCorrect);
      if (correctOptions.length !== 1) {
        throw new BadRequestException('يجب تحديد خيار واحد صحيح فقط لكل سؤال اختيار من متعدد');
      }

      const sanitizedPrompt = ContentSanitizer.sanitize(dto.prompt.trim());
      const points = dto.points !== undefined ? Number(dto.points) : 1;
      if (points <= 0) {
        throw new BadRequestException('درجة السؤال يجب أن تكون أكبر من صفر');
      }

      const orderIndex =
        dto.orderIndex !== undefined ? Number(dto.orderIndex) : exam.questions.length;

      const question = await tx.examQuestion.create({
        data: {
          tenantId,
          examId,
          prompt: sanitizedPrompt,
          questionType: dto.questionType || QuestionType.MULTIPLE_CHOICE,
          points,
          orderIndex,
        },
      });

      const createdOptions: any[] = [];
      for (let i = 0; i < dto.options.length; i++) {
        const opt = dto.options[i];
        const sanitizedContent = ContentSanitizer.sanitize(opt.content.trim());
        const createdOpt = await tx.questionOption.create({
          data: {
            questionId: question.id,
            content: sanitizedContent,
            isCorrect: opt.isCorrect,
            orderIndex: opt.orderIndex !== undefined ? opt.orderIndex : i,
          },
        });
        createdOptions.push(createdOpt);
      }

      return {
        id: question.id,
        examId: question.examId,
        prompt: question.prompt,
        questionType: question.questionType as QuestionType,
        points: Number(question.points),
        orderIndex: question.orderIndex,
        createdAt: question.createdAt.toISOString(),
        options: createdOptions.map((o) => ({
          id: o.id,
          content: o.content,
          isCorrect: o.isCorrect,
          orderIndex: o.orderIndex,
        })),
      };
    });
  }

  async updateQuestion(
    tenantId: string,
    teacherId: string,
    examId: string,
    questionId: string,
    dto: UpdateQuestionNestDto,
    userRole: UserRole,
  ) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const question = await tx.examQuestion.findFirst({
        where: { id: questionId, examId },
        include: { exam: { include: { course: true } } },
      });

      if (!question) {
        throw new NotFoundException('السؤال غير موجود');
      }

      if (userRole !== UserRole.ADMIN && question.exam.course.teacherId !== teacherId) {
        throw new ForbiddenException('غير مصرح لك بتعديل هذا السؤال');
      }

      if (question.exam.status === ExamStatus.CLOSED) {
        throw new BadRequestException('لا يمكن تعديل أسئلة اختبار مغلق');
      }

      const sanitizedPrompt =
        dto.prompt !== undefined ? ContentSanitizer.sanitize(dto.prompt.trim()) : undefined;
      const points = dto.points !== undefined ? Number(dto.points) : undefined;
      if (points !== undefined && points <= 0) {
        throw new BadRequestException('درجة السؤال يجب أن تكون أكبر من صفر');
      }

      await tx.examQuestion.update({
        where: { id: questionId },
        data: {
          prompt: sanitizedPrompt,
          points,
          questionType: dto.questionType,
          orderIndex: dto.orderIndex,
        },
      });

      if (dto.options && dto.options.length > 0) {
        const correctCount = dto.options.filter((o) => o.isCorrect).length;
        if (correctCount !== 1) {
          throw new BadRequestException('يجب تحديد خيار واحد صحيح فقط');
        }

        // Delete old options and recreate
        await tx.questionOption.deleteMany({
          where: { questionId },
        });

        for (let i = 0; i < dto.options.length; i++) {
          const opt = dto.options[i];
          await tx.questionOption.create({
            data: {
              questionId,
              content: ContentSanitizer.sanitize(opt.content.trim()),
              isCorrect: opt.isCorrect,
              orderIndex: opt.orderIndex !== undefined ? opt.orderIndex : i,
            },
          });
        }
      }

      const reloaded = await tx.examQuestion.findUniqueOrThrow({
        where: { id: questionId },
        include: {
          options: { orderBy: { orderIndex: 'asc' } },
        },
      });

      return {
        id: reloaded.id,
        examId: reloaded.examId,
        prompt: reloaded.prompt,
        questionType: reloaded.questionType as QuestionType,
        points: Number(reloaded.points),
        orderIndex: reloaded.orderIndex,
        createdAt: reloaded.createdAt.toISOString(),
        options: reloaded.options.map((o) => ({
          id: o.id,
          content: o.content,
          isCorrect: o.isCorrect,
          orderIndex: o.orderIndex,
        })),
      };
    });
  }

  async deleteQuestion(
    tenantId: string,
    teacherId: string,
    examId: string,
    questionId: string,
    userRole: UserRole,
  ) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const question = await tx.examQuestion.findFirst({
        where: { id: questionId, examId },
        include: { exam: { include: { course: true } } },
      });

      if (!question) {
        throw new NotFoundException('السؤال غير موجود');
      }

      if (userRole !== UserRole.ADMIN && question.exam.course.teacherId !== teacherId) {
        throw new ForbiddenException('غير مصرح لك بحذف هذا السؤال');
      }

      await tx.examQuestion.delete({
        where: { id: questionId },
      });

      return { message: 'تم حذف السؤال بنجاح' };
    });
  }

  async getTeacherExamSubmissions(
    tenantId: string,
    teacherId: string,
    examId: string,
    userRole: UserRole,
  ) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const exam = await tx.exam.findFirst({
        where: { id: examId, deletedAt: null },
        include: {
          course: true,
          questions: { select: { points: true } },
          attempts: {
            include: {
              student: {
                select: { id: true, displayName: true, username: true },
              },
            },
            orderBy: [{ student: { displayName: 'asc' } }, { attemptNumber: 'asc' }],
          },
        },
      });

      if (!exam) {
        throw new NotFoundException('الاختبار غير موجود');
      }

      if (userRole !== UserRole.ADMIN && exam.course.teacherId !== teacherId) {
        throw new ForbiddenException('غير مصرح لك بمشاهدة نتائج هذا الاختبار');
      }

      const totalPoints = exam.questions.reduce((sum, q) => sum + Number(q.points), 0);

      return exam.attempts.map((att) => ({
        id: att.id,
        studentId: att.student.id,
        studentName: att.student.displayName,
        studentUsername: att.student.username,
        attemptNumber: att.attemptNumber,
        startedAt: att.startedAt.toISOString(),
        submittedAt: att.submittedAt ? att.submittedAt.toISOString() : null,
        deadlineAt: att.deadlineAt.toISOString(),
        score: att.score,
        totalPoints,
        isPassed: att.isPassed,
        status: att.status as AttemptStatus,
      }));
    });
  }

  // ---------------------------------------------------------------------------
  // Student Operations (P5-002 & P5-003)
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

  async getStudentCourseExams(studentId: string, courseId: string) {
    const enrollment = await this.verifyStudentEnrollment(studentId, courseId);

    return this.prisma.withTenant(enrollment.tenantId, async (tx) => {
      const exams = await tx.exam.findMany({
        where: {
          courseId,
          status: { in: [ExamStatus.PUBLISHED, ExamStatus.CLOSED] },
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
        include: {
          questions: { select: { points: true } },
          attempts: {
            where: { studentId },
            orderBy: { attemptNumber: 'desc' },
          },
        },
      });

      return exams.map((exam) => {
        const totalPoints = exam.questions.reduce((sum, q) => sum + Number(q.points), 0);
        const attemptsUsed = exam.attempts.length;
        const remainingAttempts = Math.max(0, exam.maxAttempts - attemptsUsed);

        const activeAttempt = exam.attempts.find((a) => a.status === AttemptStatus.IN_PROGRESS);
        const completedAttempts = exam.attempts.filter((a) => a.score !== null);
        const bestScore =
          completedAttempts.length > 0
            ? Math.max(...completedAttempts.map((a) => a.score as number))
            : null;
        const isPassed = completedAttempts.some((a) => a.isPassed === true);

        return {
          id: exam.id,
          courseId: exam.courseId,
          title: exam.title,
          instructions: exam.instructions,
          durationMinutes: exam.durationMinutes,
          maxAttempts: exam.maxAttempts,
          passingScore: exam.passingScore,
          status: exam.status as ExamStatus,
          questionsCount: exam.questions.length,
          totalPoints,
          attemptsUsed,
          remainingAttempts,
          bestScore,
          isPassed: completedAttempts.length > 0 ? isPassed : null,
          hasActiveAttempt: !!activeAttempt,
          activeAttemptId: activeAttempt ? activeAttempt.id : null,
        };
      });
    });
  }

  async getStudentExamDetails(studentId: string, examId: string) {
    const exam = await this.prisma.withBypassRls(async (tx) => {
      return tx.exam.findFirst({
        where: {
          id: examId,
          deletedAt: null,
          status: { in: [ExamStatus.PUBLISHED, ExamStatus.CLOSED] },
        },
        include: {
          course: true,
          questions: { select: { points: true } },
          attempts: {
            where: { studentId },
            orderBy: { attemptNumber: 'asc' },
          },
        },
      });
    });

    if (!exam) {
      throw new NotFoundException('الاختبار غير موجود أو غير متاح للطلاب حالياً');
    }

    await this.verifyStudentEnrollment(studentId, exam.courseId);

    const totalPoints = exam.questions.reduce((sum, q) => sum + Number(q.points), 0);
    const activeAttempt = exam.attempts.find((a) => a.status === AttemptStatus.IN_PROGRESS);

    return {
      id: exam.id,
      courseId: exam.courseId,
      title: exam.title,
      instructions: exam.instructions,
      durationMinutes: exam.durationMinutes,
      maxAttempts: exam.maxAttempts,
      passingScore: exam.passingScore,
      status: exam.status as ExamStatus,
      questionsCount: exam.questions.length,
      totalPoints,
      attemptsUsed: exam.attempts.length,
      remainingAttempts: Math.max(0, exam.maxAttempts - exam.attempts.length),
      hasActiveAttempt: !!activeAttempt,
      activeAttemptId: activeAttempt ? activeAttempt.id : null,
      attempts: exam.attempts.map((a) => ({
        id: a.id,
        attemptNumber: a.attemptNumber,
        startedAt: a.startedAt.toISOString(),
        submittedAt: a.submittedAt ? a.submittedAt.toISOString() : null,
        deadlineAt: a.deadlineAt.toISOString(),
        score: a.score,
        totalPoints,
        isPassed: a.isPassed,
        status: a.status as AttemptStatus,
      })),
    };
  }

  async startExamAttempt(studentId: string, examId: string) {
    const exam = await this.prisma.withBypassRls(async (tx) => {
      return tx.exam.findFirst({
        where: { id: examId, deletedAt: null },
        include: {
          course: true,
          questions: {
            orderBy: { orderIndex: 'asc' },
            include: {
              options: { orderBy: { orderIndex: 'asc' } },
            },
          },
        },
      });
    });

    if (!exam) {
      throw new NotFoundException('الاختبار غير موجود');
    }

    if (exam.status !== ExamStatus.PUBLISHED) {
      throw new ForbiddenException('لا يمكن بدء هذا الاختبار لأن حالته ليست منشورة');
    }

    await this.verifyStudentEnrollment(studentId, exam.courseId);

    if (exam.questions.length === 0) {
      throw new BadRequestException('الاختبار لا يحتوي على أسئلة');
    }

    return this.prisma.withTenant(exam.tenantId, async (tx) => {
      const existingAttempts = await tx.examAttempt.findMany({
        where: { examId, studentId },
        orderBy: { attemptNumber: 'desc' },
      });

      // 1. Check if there is already an active attempt
      const active = existingAttempts.find((a) => a.status === AttemptStatus.IN_PROGRESS);
      const now = new Date();

      if (active) {
        // If expired by > 15 seconds, auto-grade it
        if (now.getTime() > active.deadlineAt.getTime() + 15000) {
          await this.executeAutoGrading(tx, exam, active);
        } else {
          // Return existing active attempt
          const remainingSecs = Math.max(
            0,
            Math.floor((active.deadlineAt.getTime() - now.getTime()) / 1000),
          );
          return {
            attemptId: active.id,
            examId: exam.id,
            examTitle: exam.title,
            durationMinutes: exam.durationMinutes,
            startedAt: active.startedAt.toISOString(),
            deadlineAt: active.deadlineAt.toISOString(),
            remainingSeconds: remainingSecs,
            attemptNumber: active.attemptNumber,
          };
        }
      }

      // 2. Check maximum attempts limit
      const completedCount = existingAttempts.filter(
        (a) => a.status !== AttemptStatus.IN_PROGRESS,
      ).length;
      if (completedCount >= exam.maxAttempts) {
        throw new BadRequestException('لقد استنفدت جميع المحاولات المسموح بها لهذا الاختبار');
      }

      // 3. Create new attempt
      const attemptNumber = existingAttempts.length + 1;
      const startedAt = now;
      const deadlineAt = new Date(startedAt.getTime() + exam.durationMinutes * 60 * 1000);

      const newAttempt = await tx.examAttempt.create({
        data: {
          tenantId: exam.tenantId,
          examId,
          studentId,
          attemptNumber,
          startedAt,
          deadlineAt,
          status: AttemptStatus.IN_PROGRESS,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: exam.tenantId,
          actorId: studentId,
          action: AuditAction.EXAM_ATTEMPT_STARTED,
          resourceType: 'ExamAttempt',
          resourceId: newAttempt.id,
          details: { examId, attemptNumber, deadlineAt: deadlineAt.toISOString() },
        },
      });

      return {
        attemptId: newAttempt.id,
        examId: exam.id,
        examTitle: exam.title,
        durationMinutes: exam.durationMinutes,
        startedAt: newAttempt.startedAt.toISOString(),
        deadlineAt: newAttempt.deadlineAt.toISOString(),
        remainingSeconds: exam.durationMinutes * 60,
        attemptNumber: newAttempt.attemptNumber,
      };
    });
  }

  async getActiveAttemptQuestions(studentId: string, attemptId: string) {
    const attempt = await this.prisma.withBypassRls(async (tx) => {
      return tx.examAttempt.findFirst({
        where: { id: attemptId },
        include: {
          exam: {
            include: {
              questions: {
                orderBy: { orderIndex: 'asc' },
                include: {
                  options: {
                    orderBy: { orderIndex: 'asc' },
                    select: { id: true, content: true, orderIndex: true }, // STRIP isCorrect!
                  },
                },
              },
            },
          },
          answers: true,
        },
      });
    });

    if (!attempt) {
      throw new NotFoundException('محاولة الاختبار غير موجودة');
    }

    if (attempt.studentId !== studentId) {
      throw new ForbiddenException('غير مصرح لك بالوصول لمحاولة طالب آخر');
    }

    const now = new Date();

    // Check timer: if timed out by > 15 seconds, auto-grade and lock!
    if (
      attempt.status === AttemptStatus.IN_PROGRESS &&
      now.getTime() > attempt.deadlineAt.getTime() + 15000
    ) {
      await this.prisma.withTenant(attempt.tenantId, async (tx) => {
        await this.executeAutoGrading(tx, attempt.exam, attempt);
      });
      throw new BadRequestException('انتهى الوقت المحدد للاختبار وتم اعتماد إجاباتك تلقائياً');
    }

    const remainingSecs = Math.max(
      0,
      Math.floor((attempt.deadlineAt.getTime() - now.getTime()) / 1000),
    );

    const savedAnswersMap: Record<string, string> = {};
    for (const ans of attempt.answers) {
      if (ans.selectedOptionId) {
        savedAnswersMap[ans.questionId] = ans.selectedOptionId;
      }
    }

    return {
      attemptId: attempt.id,
      examId: attempt.exam.id,
      examTitle: attempt.exam.title,
      durationMinutes: attempt.exam.durationMinutes,
      startedAt: attempt.startedAt.toISOString(),
      deadlineAt: attempt.deadlineAt.toISOString(),
      remainingSeconds: remainingSecs,
      attemptNumber: attempt.attemptNumber,
      questions: attempt.exam.questions.map((q) => ({
        id: q.id,
        prompt: q.prompt,
        questionType: q.questionType as QuestionType,
        points: Number(q.points),
        orderIndex: q.orderIndex,
        options: q.options.map((o) => ({
          id: o.id,
          content: o.content,
          orderIndex: o.orderIndex,
        })),
      })),
      savedAnswers: savedAnswersMap,
    };
  }

  async saveAnswer(studentId: string, attemptId: string, dto: SaveAnswerNestDto) {
    const attempt = await this.prisma.withBypassRls(async (tx) => {
      return tx.examAttempt.findFirst({
        where: { id: attemptId },
        include: { exam: true },
      });
    });

    if (!attempt) {
      throw new NotFoundException('محاولة الاختبار غير موجودة');
    }

    if (attempt.studentId !== studentId) {
      throw new ForbiddenException('غير مصرح لك بتسجيل إجابات لمحاولة طالب آخر');
    }

    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('لا يمكن حفظ إجابات لمحاولة مكتملة أو مغلقة');
    }

    const now = new Date();
    if (now.getTime() > attempt.deadlineAt.getTime() + 15000) {
      // Auto-grade on timeout
      await this.prisma.withTenant(attempt.tenantId, async (tx) => {
        await this.executeAutoGrading(tx, attempt.exam, attempt);
      });
      throw new BadRequestException('انتهى الوقت المحدد للاختبار');
    }

    return this.prisma.withTenant(attempt.tenantId, async (tx) => {
      // Verify question and option
      const question = await tx.examQuestion.findFirst({
        where: { id: dto.questionId, examId: attempt.examId },
        include: { options: true },
      });

      if (!question) {
        throw new NotFoundException('السؤال غير تابع لهذا الاختبار');
      }

      const option = question.options.find((o) => o.id === dto.selectedOptionId);
      if (!option) {
        throw new BadRequestException('الخيار المحدد غير تابع لهذا السؤال');
      }

      // Upsert AttemptAnswer
      const answer = await tx.attemptAnswer.upsert({
        where: {
          attemptId_questionId: {
            attemptId,
            questionId: dto.questionId,
          },
        },
        update: {
          selectedOptionId: dto.selectedOptionId,
          savedAt: now,
        },
        create: {
          tenantId: attempt.tenantId,
          attemptId,
          questionId: dto.questionId,
          selectedOptionId: dto.selectedOptionId,
          savedAt: now,
        },
      });

      return {
        questionId: answer.questionId,
        selectedOptionId: answer.selectedOptionId,
        savedAt: answer.savedAt.toISOString(),
      };
    });
  }

  async submitExamAttempt(studentId: string, attemptId: string) {
    const attempt = await this.prisma.withBypassRls(async (tx) => {
      return tx.examAttempt.findFirst({
        where: { id: attemptId },
        include: { exam: true },
      });
    });

    if (!attempt) {
      throw new NotFoundException('محاولة الاختبار غير موجودة');
    }

    if (attempt.studentId !== studentId) {
      throw new ForbiddenException('غير مصرح لك بتسليم محاولة طالب آخر');
    }

    if (attempt.status !== AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('تم تسليم وتصحيح هذه المحاولة مسبقاً');
    }

    return this.prisma.withTenant(attempt.tenantId, async (tx) => {
      return this.executeAutoGrading(tx, attempt.exam, attempt);
    });
  }

  private async executeAutoGrading(tx: any, exam: any, attempt: any) {
    const now = new Date();

    // 1. Fetch all questions with correct options
    const questions = await tx.examQuestion.findMany({
      where: { examId: exam.id },
      include: { options: true },
    });

    // 2. Fetch all student saved answers
    const answers = await tx.attemptAnswer.findMany({
      where: { attemptId: attempt.id },
    });

    const answersMap = new Map<string, string | null>();
    for (const a of answers) {
      answersMap.set(a.questionId, a.selectedOptionId);
    }

    let earnedScore = 0;
    let totalPoints = 0;

    // 3. Grade each question
    for (const q of questions) {
      const qPoints = Number(q.points);
      totalPoints += qPoints;

      const selectedOptId = answersMap.get(q.id);
      const correctOpt = q.options.find((o: any) => o.isCorrect);

      let awardedPoints = 0;
      if (selectedOptId && correctOpt && selectedOptId === correctOpt.id) {
        awardedPoints = qPoints;
        earnedScore += qPoints;
      }

      // Update attempt answer record
      if (selectedOptId) {
        await tx.attemptAnswer.update({
          where: {
            attemptId_questionId: {
              attemptId: attempt.id,
              questionId: q.id,
            },
          },
          data: {
            isAutoGraded: true,
            awardedPoints,
          },
        });
      } else {
        // Create blank answer record if not answered
        await tx.attemptAnswer.create({
          data: {
            tenantId: attempt.tenantId,
            attemptId: attempt.id,
            questionId: q.id,
            selectedOptionId: null,
            isAutoGraded: true,
            awardedPoints: 0,
            savedAt: now,
          },
        });
      }
    }

    const percentage = totalPoints > 0 ? Math.round((earnedScore / totalPoints) * 100) : 0;
    const isPassed =
      exam.passingScore !== null ? earnedScore >= Number(exam.passingScore) : null;

    // 4. Update ExamAttempt status to GRADED
    const gradedAttempt = await tx.examAttempt.update({
      where: { id: attempt.id },
      data: {
        score: earnedScore,
        isPassed,
        status: AttemptStatus.GRADED,
        submittedAt: now,
      },
    });

    // 5. Atomic GradeRecord Synchronization
    // Keep best score among attempts
    const existingGrade = await tx.gradeRecord.findFirst({
      where: {
        courseId: exam.courseId,
        studentId: attempt.studentId,
        itemType: 'EXAM',
        itemId: exam.id,
      },
    });

    const finalScore = existingGrade
      ? Math.max(existingGrade.score, earnedScore)
      : earnedScore;

    await tx.gradeRecord.upsert({
      where: {
        courseId_studentId_itemType_itemId: {
          courseId: exam.courseId,
          studentId: attempt.studentId,
          itemType: 'EXAM',
          itemId: exam.id,
        },
      },
      update: {
        score: finalScore,
        maxScore: totalPoints,
        recordedAt: now,
      },
      create: {
        tenantId: attempt.tenantId,
        courseId: exam.courseId,
        studentId: attempt.studentId,
        itemType: 'EXAM',
        itemId: exam.id,
        score: finalScore,
        maxScore: totalPoints,
        recordedAt: now,
      },
    });

    // 6. Record Audit Log
    await tx.auditLog.create({
      data: {
        tenantId: attempt.tenantId,
        actorId: attempt.studentId,
        action: AuditAction.EXAM_AUTO_GRADED,
        resourceType: 'ExamAttempt',
        resourceId: attempt.id,
        details: {
          examId: exam.id,
          attemptNumber: attempt.attemptNumber,
          score: earnedScore,
          totalPoints,
          percentage,
          isPassed,
        },
      },
    });

    return {
      attemptId: gradedAttempt.id,
      examId: exam.id,
      attemptNumber: gradedAttempt.attemptNumber,
      score: earnedScore,
      totalPoints,
      percentage,
      isPassed,
      passingScore: exam.passingScore,
      status: gradedAttempt.status as AttemptStatus,
      submittedAt: now.toISOString(),
    };
  }

  async getAttemptReview(studentId: string, attemptId: string, userRole: UserRole) {
    const attempt = await this.prisma.withBypassRls(async (tx) => {
      return tx.examAttempt.findFirst({
        where: { id: attemptId },
        include: {
          exam: {
            include: {
              course: true,
              questions: {
                orderBy: { orderIndex: 'asc' },
                include: {
                  options: { orderBy: { orderIndex: 'asc' } },
                },
              },
            },
          },
          answers: true,
        },
      });
    });

    if (!attempt) {
      throw new NotFoundException('محاولة الاختبار غير موجودة');
    }

    if (
      userRole === UserRole.STUDENT &&
      attempt.studentId !== studentId
    ) {
      throw new ForbiddenException('غير مصرح لك بمراجعة محاولة طالب آخر');
    }

    if (
      userRole === UserRole.TEACHER &&
      attempt.exam.course.teacherId !== studentId
    ) {
      throw new ForbiddenException('غير مصرح لك بمراجعة نتائج اختبار لمقرر معلم آخر');
    }

    if (attempt.status === AttemptStatus.IN_PROGRESS) {
      throw new BadRequestException('لا يمكن مراجعة إجابات اختبار لا يزال قيد التنفيذ');
    }

    const totalPoints = attempt.exam.questions.reduce(
      (sum, q) => sum + Number(q.points),
      0,
    );
    const score = attempt.score || 0;
    const percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;

    const answersMap = new Map<string, any>();
    for (const a of attempt.answers) {
      answersMap.set(a.questionId, a);
    }

    return {
      attemptId: attempt.id,
      examId: attempt.exam.id,
      examTitle: attempt.exam.title,
      attemptNumber: attempt.attemptNumber,
      score,
      totalPoints,
      percentage,
      isPassed: attempt.isPassed,
      passingScore: attempt.exam.passingScore,
      submittedAt: attempt.submittedAt ? attempt.submittedAt.toISOString() : null,
      questions: attempt.exam.questions.map((q) => {
        const ans = answersMap.get(q.id);
        const correctOpt = q.options.find((o) => o.isCorrect);
        const isCorrect =
          ans && correctOpt && ans.selectedOptionId === correctOpt.id;

        return {
          questionId: q.id,
          prompt: q.prompt,
          points: Number(q.points),
          awardedPoints: ans ? Number(ans.awardedPoints || 0) : 0,
          selectedOptionId: ans ? ans.selectedOptionId : null,
          correctOptionId: correctOpt ? correctOpt.id : '',
          isCorrect: !!isCorrect,
          options: q.options.map((o) => ({
            id: o.id,
            content: o.content,
            isCorrect: o.isCorrect,
          })),
        };
      }),
    };
  }
}
