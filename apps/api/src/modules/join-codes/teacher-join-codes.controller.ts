import {
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole, UserSummaryDto, TenantMembershipDto } from '@darb/contracts';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { JoinCodesService } from './join-codes.service';

@ApiTags('Teacher Join Codes')
@ApiCookieAuth('darb_session')
@ApiBearerAuth()
@Controller('teacher/join-codes')
@UseGuards(AuthGuard, RolesGuard, TenantGuard)
@Roles(UserRole.TEACHER, UserRole.ADMIN)
export class TeacherJoinCodesController {
  constructor(private readonly joinCodesService: JoinCodesService) {}

  @Post(':joinCodeId/revoke')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke an existing join code immediately' })
  async revokeJoinCode(
    @CurrentUser() user: UserSummaryDto,
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @Param('joinCodeId', ParseUUIDPipe) joinCodeId: string,
  ) {
    return this.joinCodesService.revokeJoinCode(
      activeTenant.tenantId,
      user.id,
      joinCodeId,
      user.role,
    );
  }
}
