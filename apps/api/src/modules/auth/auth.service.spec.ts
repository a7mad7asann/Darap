import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../../database/prisma.service';
import { UserRole } from '@darb/contracts';

describe('AuthService', () => {
  let authService: AuthService;
  let prismaService: jest.Mocked<any>;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'SESSION_SECRET') return 'super-secret-key-that-is-at-least-32-characters-long!';
      if (key === 'SESSION_TTL_HOURS') return 24;
      if (key === 'RATE_LIMIT_TTL_MS') return 60000;
      if (key === 'RATE_LIMIT_MAX_ATTEMPTS') return 3;
      return null;
    }),
  };

  beforeEach(async () => {
    prismaService = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe('Password Hashing & Verification with Argon2id', () => {
    it('should hash a password and verify it correctly', async () => {
      const password = 'SuperSecretPassword123!';
      const hash = await authService.hashPassword(password);

      expect(hash).toContain('$argon2id$');

      const isMatch = await authService.verifyPassword(hash, password);
      expect(isMatch).toBe(true);

      const isWrong = await authService.verifyPassword(hash, 'WrongPassword');
      expect(isWrong).toBe(false);
    });
  });

  describe('Login Authentication & Lockout', () => {
    it('should fail with UnauthorizedException when user is not found', async () => {
      prismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({ username: 'nonexistent', password: 'password123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should fail with ForbiddenException when user is locked', async () => {
      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'locked_user',
        lockedUntil: new Date(Date.now() + 10 * 60 * 1000), // locked in future
        isActive: true,
        deletedAt: null,
      });

      await expect(
        authService.login({ username: 'locked_user', password: 'password123' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should authenticate valid user and return session token', async () => {
      const rawPassword = 'ValidPassword123!';
      const passwordHash = await authService.hashPassword(rawPassword);

      prismaService.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'teacher1',
        displayName: 'Teacher One',
        email: 'teacher1@school.local',
        passwordHash,
        defaultRole: UserRole.TEACHER,
        isActive: true,
        deletedAt: null,
        failedLoginAttempts: 0,
        lockedUntil: null,
        createdAt: new Date(),
        memberships: [
          {
            id: 'mem-1',
            tenantId: 'tenant-1',
            role: UserRole.TEACHER,
            isOwner: true,
            tenant: {
              name: 'School Alpha',
              slug: 'school-alpha',
            },
          },
        ],
      });

      const result = await authService.login({
        username: 'teacher1',
        password: rawPassword,
      });

      expect(result.sessionToken).toBeDefined();
      expect(result.user.username).toBe('teacher1');
      expect(result.activeTenant?.tenantId).toBe('tenant-1');
      expect(result.memberships.length).toBe(1);
    });
  });
});
