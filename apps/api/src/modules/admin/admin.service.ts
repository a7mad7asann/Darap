import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { hash, Algorithm } from '@node-rs/argon2';
import { AuditAction, MembershipStatus, TenantStatus, UserRole } from '@darb/contracts';
import { PrismaService } from '../../database/prisma.service';
import { CreateTeacherNestDto } from './dto/create-teacher.dto';
import { CreateStudentNestDto } from './dto/create-student.dto';
import { AdminResetPasswordNestDto } from './dto/update-status.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  private async hashPassword(password: string): Promise<string> {
    return hash(password, {
      algorithm: Algorithm.Argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
  }

  async createTeacher(adminId: string, dto: CreateTeacherNestDto) {
    // Check username collision
    const existingUser = await this.prisma.user.findUnique({
      where: { username: dto.username.trim() },
    });
    if (existingUser) {
      throw new ConflictException('اسم المستخدم مستخدم بالفعل');
    }

    // Check slug collision
    const existingTenant = await this.prisma.tenant.findUnique({
      where: { slug: dto.slug.trim().toLowerCase() },
    });
    if (existingTenant) {
      throw new ConflictException('معرف الرابط (Slug) مستخدم بالفعل لمدرسة أخرى');
    }

    const passwordHash = await this.hashPassword(dto.password);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          username: dto.username.trim(),
          passwordHash,
          displayName: dto.displayName.trim(),
          email: dto.email?.trim() || null,
          defaultRole: UserRole.TEACHER,
          isActive: true,
          teacherProfile: {
            create: {
              specialization: dto.specialization?.trim() || null,
            },
          },
        },
      });

      const tenant = await tx.tenant.create({
        data: {
          name: dto.schoolName.trim(),
          slug: dto.slug.trim().toLowerCase(),
          ownerId: user.id,
          status: TenantStatus.ACTIVE,
          memberships: {
            create: {
              userId: user.id,
              role: UserRole.TEACHER,
              isOwner: true,
              status: MembershipStatus.ACTIVE,
            },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          actorId: adminId,
          action: AuditAction.TENANT_CREATED,
          resourceType: 'Tenant',
          resourceId: tenant.id,
          details: { schoolName: tenant.name, ownerUsername: user.username },
        },
      });

      return {
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        tenantId: tenant.id,
        schoolName: tenant.name,
        slug: tenant.slug,
        message: 'تم إنشاء حساب المعلم ومساحة العمل بنجاح',
      };
    });
  }

  async createStudent(adminId: string, dto: CreateStudentNestDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { username: dto.username.trim() },
    });
    if (existingUser) {
      throw new ConflictException('اسم المستخدم مستخدم بالفعل');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: dto.tenantId },
    });
    if (!tenant) {
      throw new NotFoundException('مساحة العمل المحددة غير موجودة');
    }

    const passwordHash = await this.hashPassword(dto.password);

    return this.prisma.$transaction(async (tx) => {
      const student = await tx.user.create({
        data: {
          username: dto.username.trim(),
          passwordHash,
          displayName: dto.displayName.trim(),
          email: null, // Students login by username only!
          defaultRole: UserRole.STUDENT,
          isActive: true,
          studentProfile: {
            create: {
              gradeLevel: dto.gradeLevel?.trim() || null,
              parentPhone: dto.parentPhone?.trim() || null,
            },
          },
          memberships: {
            create: {
              tenantId: dto.tenantId,
              role: UserRole.STUDENT,
              status: MembershipStatus.ACTIVE,
            },
          },
        },
      });

      return {
        userId: student.id,
        username: student.username,
        displayName: student.displayName,
        tenantId: tenant.id,
        tenantName: tenant.name,
        message: 'تم إنشاء حساب الطالب بنجاح',
      };
    });
  }

  async listUsers(page = 1, limit = 50) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: { deletedAt: null },
        include: {
          memberships: {
            include: { tenant: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where: { deletedAt: null } }),
    ]);

    return {
      items: users.map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        email: u.email,
        role: u.defaultRole as UserRole,
        isActive: u.isActive,
        failedLoginAttempts: u.failedLoginAttempts,
        lockedUntil: u.lockedUntil ? u.lockedUntil.toISOString() : null,
        createdAt: u.createdAt.toISOString(),
        tenantName: u.memberships.length > 0 ? u.memberships[0].tenant.name : undefined,
        tenantSlug: u.memberships.length > 0 ? u.memberships[0].tenant.slug : undefined,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateUserStatus(adminId: string, userId: string, isActive: boolean) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        isActive,
        lockedUntil: isActive ? null : user.lockedUntil,
      },
    });

    return {
      userId: updated.id,
      isActive: updated.isActive,
      message: isActive ? 'تم تفعيل الحساب' : 'تم تعطيل الحساب',
    };
  }

  async resetUserPassword(adminId: string, userId: string, dto: AdminResetPasswordNestDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('المستخدم غير موجود');
    }

    const passwordHash = await this.hashPassword(dto.newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: adminId,
        action: AuditAction.PASSWORD_RESET,
        resourceType: 'User',
        resourceId: user.id,
        details: {
          username: user.username,
          reason: dto.reason || 'Admin-assisted recovery',
        },
      },
    });

    return {
      userId: user.id,
      username: user.username,
      message: 'تم إعادة تعيين كلمة المرور بنجاح وتسجيل العملية في سجل التدقيق',
    };
  }
}
