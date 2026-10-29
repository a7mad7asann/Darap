import { Injectable, UnauthorizedException, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { hash, verify, Algorithm } from '@node-rs/argon2';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { AuditAction, TenantMembershipDto, UserRole, UserSummaryDto } from '@darb/contracts';

interface SessionPayload {
  sub: string;
  username: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

interface RateLimitTracker {
  count: number;
  resetAt: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly rateLimits = new Map<string, RateLimitTracker>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async hashPassword(password: string): Promise<string> {
    return hash(password, {
      algorithm: Algorithm.Argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });
  }

  async verifyPassword(hash: string, plain: string): Promise<boolean> {
    try {
      return await verify(hash, plain);
    } catch {
      return false;
    }
  }

  private checkRateLimit(key: string) {
    const now = Date.now();
    const ttl = this.configService.get<number>('RATE_LIMIT_TTL_MS') || 60000;
    const max = this.configService.get<number>('RATE_LIMIT_MAX_ATTEMPTS') || 5;

    const record = this.rateLimits.get(key);
    if (!record || now > record.resetAt) {
      this.rateLimits.set(key, { count: 1, resetAt: now + ttl });
      return;
    }

    if (record.count >= max) {
      const waitSeconds = Math.ceil((record.resetAt - now) / 1000);
      throw new ForbiddenException(
        `Too many login attempts. Please try again after ${waitSeconds} seconds.`,
      );
    }

    record.count++;
  }

  private resetRateLimit(key: string) {
    this.rateLimits.delete(key);
  }

  async login(
    dto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    sessionToken: string;
    user: UserSummaryDto;
    activeTenant: TenantMembershipDto | null;
    memberships: TenantMembershipDto[];
  }> {
    const rateLimitKey = `${ipAddress || 'unknown'}:${dto.username.toLowerCase()}`;
    this.checkRateLimit(rateLimitKey);

    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
      include: {
        memberships: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!user) {
      this.logger.warn(`Failed login for non-existent user: ${dto.username}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check account lockout
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new ForbiddenException(
        'Account is temporarily locked due to multiple failed login attempts. Please contact an administrator.',
      );
    }

    if (!user.isActive || user.deletedAt) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await this.verifyPassword(user.passwordHash, dto.password);
    if (!isMatch) {
      const newAttempts = user.failedLoginAttempts + 1;
      const lockedUntil = newAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: newAttempts,
          lockedUntil,
        },
      });

      this.logger.warn(
        `Failed password attempt for user: ${user.username} (attempt ${newAttempts})`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    // Reset failed login attempts on successful login
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      });
    }

    this.resetRateLimit(rateLimitKey);

    // Map memberships
    const memberships: TenantMembershipDto[] = user.memberships.map((m) => ({
      membershipId: m.id,
      tenantId: m.tenantId,
      tenantName: m.tenant.name,
      tenantSlug: m.tenant.slug,
      role: m.role as UserRole,
      isOwner: m.isOwner,
    }));

    const activeTenant = memberships.length > 0 ? memberships[0] : null;

    const secret = this.configService.get<string>('SESSION_SECRET')!;
    const ttlHours = this.configService.get<number>('SESSION_TTL_HOURS') || 24;

    const payload: SessionPayload = {
      sub: user.id,
      username: user.username,
      role: user.defaultRole as UserRole,
    };

    const sessionToken = jwt.sign(payload, secret, {
      expiresIn: `${ttlHours}h`,
    });

    // Write audit log
    await this.prisma.auditLog.create({
      data: {
        actorId: user.id,
        tenantId: activeTenant ? activeTenant.tenantId : null,
        action: AuditAction.USER_LOGIN,
        resourceType: 'User',
        resourceId: user.id,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        details: { username: user.username },
      },
    });

    const userSummary: UserSummaryDto = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      email: user.email,
      role: user.defaultRole as UserRole,
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
    };

    return {
      sessionToken,
      user: userSummary,
      activeTenant,
      memberships,
    };
  }

  async validateSessionToken(token: string): Promise<{
    user: UserSummaryDto;
    activeTenant: TenantMembershipDto | null;
    memberships: TenantMembershipDto[];
  } | null> {
    try {
      const secret = this.configService.get<string>('SESSION_SECRET')!;
      const decoded = jwt.verify(token, secret) as SessionPayload;

      const user = await this.prisma.user.findUnique({
        where: { id: decoded.sub },
        include: {
          memberships: {
            include: {
              tenant: true,
            },
          },
        },
      });

      if (!user || !user.isActive || user.deletedAt) {
        return null;
      }

      const memberships: TenantMembershipDto[] = user.memberships.map((m) => ({
        membershipId: m.id,
        tenantId: m.tenantId,
        tenantName: m.tenant.name,
        tenantSlug: m.tenant.slug,
        role: m.role as UserRole,
        isOwner: m.isOwner,
      }));

      const activeTenant = memberships.length > 0 ? memberships[0] : null;

      const userSummary: UserSummaryDto = {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        role: user.defaultRole as UserRole,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
      };

      return {
        user: userSummary,
        activeTenant,
        memberships,
      };
    } catch {
      return null;
    }
  }

  async logLogout(
    userId: string,
    activeTenantId: string | null,
    ipAddress?: string,
    userAgent?: string,
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: userId,
          tenantId: activeTenantId,
          action: AuditAction.USER_LOGOUT,
          resourceType: 'User',
          resourceId: userId,
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        },
      });
    } catch (e: any) {
      this.logger.error(`Error logging logout: ${e.message}`);
    }
  }
}
