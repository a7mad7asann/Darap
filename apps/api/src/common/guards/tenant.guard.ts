import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { TenantMembershipDto } from '@darb/contracts';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const activeTenant = (request as any).activeTenant as TenantMembershipDto | undefined;
    const memberships = ((request as any).memberships || []) as TenantMembershipDto[];

    // Check if client tried to specify a tenant in header
    const requestedTenantId = request.headers['x-tenant-id'];

    if (requestedTenantId && typeof requestedTenantId === 'string') {
      const isMember = memberships.some((m) => m.tenantId === requestedTenantId);
      if (!isMember) {
        throw new ForbiddenException(
          'Cross-tenant access forbidden: User does not belong to the requested workspace',
        );
      }
      return true;
    }

    if (!activeTenant) {
      throw new ForbiddenException(
        'Tenant context missing: user does not have an active tenant membership',
      );
    }

    return true;
  }
}
