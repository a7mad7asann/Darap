import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { TenantGuard } from './tenant.guard';
import { UserRole } from '@darb/contracts';

describe('Guards', () => {
  describe('RolesGuard', () => {
    let rolesGuard: RolesGuard;
    let reflector: Reflector;

    beforeEach(() => {
      reflector = new Reflector();
      rolesGuard = new RolesGuard(reflector);
    });

    function mockContext(user: any): ExecutionContext {
      return {
        switchToHttp: () => ({
          getRequest: () => ({ user }),
        }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as unknown as ExecutionContext;
    }

    it('should allow access when no roles are required', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
      const ctx = mockContext({ role: UserRole.STUDENT });
      expect(rolesGuard.canActivate(ctx)).toBe(true);
    });

    it('should allow access when user role matches', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.TEACHER, UserRole.ADMIN]);
      const ctx = mockContext({ role: UserRole.TEACHER });
      expect(rolesGuard.canActivate(ctx)).toBe(true);
    });

    it('should throw ForbiddenException when user does not have required role', () => {
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([UserRole.TEACHER, UserRole.ADMIN]);
      const ctx = mockContext({ role: UserRole.STUDENT });
      expect(() => rolesGuard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });

  describe('TenantGuard', () => {
    let tenantGuard: TenantGuard;

    beforeEach(() => {
      tenantGuard = new TenantGuard();
    });

    function mockTenantContext(
      headers: any,
      activeTenant: any,
      memberships: any[],
    ): ExecutionContext {
      return {
        switchToHttp: () => ({
          getRequest: () => ({
            headers,
            activeTenant,
            memberships,
          }),
        }),
      } as unknown as ExecutionContext;
    }

    it('should allow access when user has valid active tenant', () => {
      const ctx = mockTenantContext({}, { tenantId: 'tenant-1' }, [{ tenantId: 'tenant-1' }]);
      expect(tenantGuard.canActivate(ctx)).toBe(true);
    });

    it('should throw ForbiddenException when user attempts cross-tenant header spoofing', () => {
      // User belongs to tenant-1, but sends x-tenant-id for tenant-2
      const ctx = mockTenantContext({ 'x-tenant-id': 'tenant-2' }, { tenantId: 'tenant-1' }, [
        { tenantId: 'tenant-1' },
      ]);
      expect(() => tenantGuard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('should allow access when user explicitly switches to a tenant they belong to', () => {
      const ctx = mockTenantContext({ 'x-tenant-id': 'tenant-2' }, { tenantId: 'tenant-1' }, [
        { tenantId: 'tenant-1' },
        { tenantId: 'tenant-2' },
      ]);
      expect(tenantGuard.canActivate(ctx)).toBe(true);
    });
  });
});
