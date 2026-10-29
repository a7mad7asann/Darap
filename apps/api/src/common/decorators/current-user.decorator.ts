import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserSummaryDto } from '@darb/contracts';

export const CurrentUser = createParamDecorator(
  (data: keyof UserSummaryDto | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as UserSummaryDto;
    return data && user ? user[data] : user;
  },
);
