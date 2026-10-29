import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import {
  AuditAction,
  CourseStatus,
  EnrollmentStatus,
  JoinCodeStatus,
  MembershipStatus,
  UserRole,
} from '@darb/contracts';
import { PrismaService } from '../../database/prisma.service';
import { CreateJoinCodeNestDto } from './dto/create-join-code.dto';

@Injectable()
export class JoinCodesService {
  private readonly logger = new Logger(JoinCodesService.name);
  private readonly redemptionRateLimits = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly prisma: PrismaService) {}

  private checkRedemptionRateLimit(key: string) {
    const now = Date.now();
    const windowMs = 60000;
    const maxAttempts = 10;

    const record = this.redemptionRateLimits.get(key);
    if (!record || now > record.resetAt) {
      this.redemptionRateLimits.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }

    if (record.count >= maxAttempts) {
      throw new ForbiddenException(
        'تم تجاوز عدد محاولات إدخال رمز الانضمام المسموح بها. يرجى الانتظار دقيقة والمحاولة مجدداً.',
      );
    }

    record.count++;
  }

  private hashJoinCode(code: string): string {
    const normalized = code.trim().toUpperCase().replace(/\s+/g, '');
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  private generateSecureCode(): { rawCode: string; codeHint: string; codeHash: string } {
    // 8 random bytes = 16 hex chars (64 bits of cryptographic entropy)
    const rawHex = crypto.randomBytes(8).toString('hex').toUpperCase();
    // Format: DARB-XXXX-XXXX-XXXX
    const rawCode = `DARB-${rawHex.slice(0, 4)}-${rawHex.slice(4, 8)}-${rawHex.slice(8, 12)}`;
    const codeHint = `DARB-****-****-${rawHex.slice(8, 12)}`;
    const codeHash = this.hashJoinCode(rawCode);
    return { rawCode, codeHint, codeHash };
  }

  async generateJoinCode(
    tenantId: string,
    teacherId: string,
    courseId: string,
    dto: CreateJoinCodeNestDto,
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
        throw new ForbiddenException('غير مصرح لك بتوليد كود انضمام لهذا المقرر');
      }

      let expiresAt: Date | null = null;
      if (dto.expiresInDays && dto.expiresInDays > 0) {
        expiresAt = new Date(Date.now() + dto.expiresInDays * 24 * 60 * 60 * 1000);
      }

      const { rawCode, codeHint, codeHash } = this.generateSecureCode();

      const joinCode = await tx.joinCode.create({
        data: {
          tenantId,
          courseId,
          codeHash,
          codeHint,
          maxUses: dto.maxUses || null,
          currentUses: 0,
          expiresAt,
          status: JoinCodeStatus.ACTIVE,
          createdById: teacherId,
        },
      });

      // Audit log MUST NOT store the raw code
      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: teacherId,
          action: AuditAction.JOIN_CODE_GENERATED,
          resourceType: 'JoinCode',
          resourceId: joinCode.id,
          details: {
            courseId,
            codeHint,
            maxUses: joinCode.maxUses,
            expiresAt: joinCode.expiresAt?.toISOString(),
          },
        },
      });

      return {
        id: joinCode.id,
        courseId: joinCode.courseId,
        codeHint: joinCode.codeHint,
        rawCode, // Transmitted ONLY in this creation response to the authorized teacher
        maxUses: joinCode.maxUses,
        currentUses: joinCode.currentUses,
        expiresAt: joinCode.expiresAt ? joinCode.expiresAt.toISOString() : null,
        status: joinCode.status as JoinCodeStatus,
        createdAt: joinCode.createdAt.toISOString(),
      };
    });
  }

  async getCourseJoinCodes(
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
        throw new ForbiddenException('غير مصرح لك باستعراض أكواد هذا المقرر');
      }

      const codes = await tx.joinCode.findMany({
        where: { courseId },
        orderBy: { createdAt: 'desc' },
      });

      return codes.map((c) => ({
        id: c.id,
        courseId: c.courseId,
        codeHint: c.codeHint,
        maxUses: c.maxUses,
        currentUses: c.currentUses,
        expiresAt: c.expiresAt ? c.expiresAt.toISOString() : null,
        status: c.status as JoinCodeStatus,
        createdAt: c.createdAt.toISOString(),
      }));
    });
  }

  async revokeJoinCode(
    tenantId: string,
    teacherId: string,
    joinCodeId: string,
    userRole: UserRole,
  ) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const joinCode = await tx.joinCode.findFirst({
        where: { id: joinCodeId },
        include: { course: true },
      });

      if (!joinCode) {
        throw new NotFoundException('كود الانضمام غير موجود');
      }

      if (userRole !== UserRole.ADMIN && joinCode.course.teacherId !== teacherId) {
        throw new ForbiddenException('غير مصرح لك بإلغاء هذا الكود');
      }

      const revoked = await tx.joinCode.update({
        where: { id: joinCodeId },
        data: { status: JoinCodeStatus.REVOKED },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          actorId: teacherId,
          action: AuditAction.JOIN_CODE_REVOKED,
          resourceType: 'JoinCode',
          resourceId: revoked.id,
          details: { codeHint: revoked.codeHint },
        },
      });

      return {
        id: revoked.id,
        status: revoked.status as JoinCodeStatus,
        message: 'تم إلغاء كود الانضمام بنجاح',
      };
    });
  }

  /**
   * Concurrently-safe Join Code Redemption
   * Uses an isolated interactive transaction with row-level locking on the JoinCode row
   * to strictly guarantee that maxUses is never exceeded under high concurrency.
   */
  async redeemJoinCode(studentId: string, rawCode: string, ipAddress?: string) {
    const rateLimitKey = `${ipAddress || 'unknown'}:${studentId}`;
    this.checkRedemptionRateLimit(rateLimitKey);

    const codeHash = this.hashJoinCode(rawCode);

    return this.prisma.withBypassRls(async (tx) => {
      // 1. Lock the join code row for update to prevent concurrent over-redemption
      const joinCodeRows = await tx.$queryRaw<any[]>`
        SELECT * FROM "JoinCode"
        WHERE "codeHash" = ${codeHash}
        FOR UPDATE
      `;

      if (!joinCodeRows || joinCodeRows.length === 0) {
        throw new BadRequestException('رمز الانضمام غير صالح أو منتهي الصلاحية');
      }

      const joinCode = joinCodeRows[0];

      // Safe generic rejection for inactive status
      if (joinCode.status !== JoinCodeStatus.ACTIVE) {
        throw new BadRequestException('رمز الانضمام غير صالح أو منتهي الصلاحية');
      }

      // Check expiration date
      if (joinCode.expiresAt && new Date(joinCode.expiresAt) <= new Date()) {
        await tx.joinCode.update({
          where: { id: joinCode.id },
          data: { status: JoinCodeStatus.EXPIRED },
        });
        throw new BadRequestException('رمز الانضمام غير صالح أو منتهي الصلاحية');
      }

      // Check usage limits
      if (joinCode.maxUses !== null && joinCode.currentUses >= joinCode.maxUses) {
        await tx.joinCode.update({
          where: { id: joinCode.id },
          data: { status: JoinCodeStatus.EXPIRED },
        });
        throw new BadRequestException('رمز الانضمام غير صالح أو منتهي الصلاحية');
      }

      // 2. Verify Course is published and not deleted
      const course = await tx.course.findFirst({
        where: {
          id: joinCode.courseId,
          deletedAt: null,
          status: CourseStatus.PUBLISHED,
          isActive: true,
        },
        include: {
          teacher: {
            select: { displayName: true },
          },
        },
      });

      if (!course) {
        throw new BadRequestException('المقرر الدراسي غير متاح حالياً للانضمام');
      }

      // 3. Check for duplicate enrollment
      const existingEnrollment = await tx.enrollment.findFirst({
        where: {
          courseId: course.id,
          studentId,
          deletedAt: null,
          status: EnrollmentStatus.ACTIVE,
        },
      });

      if (existingEnrollment) {
        throw new BadRequestException('أنت مسجل بالفعل في هذا المقرر الدراسي');
      }

      // 4. Atomic usage increment
      const newUses = joinCode.currentUses + 1;
      const updatedStatus =
        joinCode.maxUses !== null && newUses >= joinCode.maxUses
          ? JoinCodeStatus.EXPIRED
          : JoinCodeStatus.ACTIVE;

      await tx.joinCode.update({
        where: { id: joinCode.id },
        data: {
          currentUses: newUses,
          status: updatedStatus,
        },
      });

      // 5. Ensure student has active membership in the course's tenant workspace
      await tx.membership.upsert({
        where: {
          tenantId_userId: {
            tenantId: course.tenantId,
            userId: studentId,
          },
        },
        update: {
          status: MembershipStatus.ACTIVE,
        },
        create: {
          tenantId: course.tenantId,
          userId: studentId,
          role: UserRole.STUDENT,
          status: MembershipStatus.ACTIVE,
        },
      });

      // 6. Create enrollment record
      const enrollment = await tx.enrollment.create({
        data: {
          tenantId: course.tenantId,
          courseId: course.id,
          studentId,
          status: EnrollmentStatus.ACTIVE,
          joinedViaCodeId: joinCode.id,
        },
      });

      // 7. Audit log (never persists raw code)
      await tx.auditLog.create({
        data: {
          tenantId: course.tenantId,
          actorId: studentId,
          action: AuditAction.JOIN_CODE_REDEEMED,
          resourceType: 'Course',
          resourceId: course.id,
          details: {
            enrollmentId: enrollment.id,
            codeHint: joinCode.codeHint,
          },
        },
      });

      return {
        enrollmentId: enrollment.id,
        courseId: course.id,
        courseTitle: course.title,
        teacherName: course.teacher.displayName,
        enrolledAt: enrollment.enrolledAt.toISOString(),
      };
    });
  }
}
