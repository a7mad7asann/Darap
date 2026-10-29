import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantMembershipDto } from '@darb/contracts';

export const CurrentTenant = createParamDecorator(
  (data: keyof TenantMembershipDto | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const tenant = request.activeTenant as TenantMembershipDto | undefined;
    return data && tenant ? tenant[data] : tenant;
  },
);
