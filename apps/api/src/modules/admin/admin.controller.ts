import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole, UserSummaryDto } from '@darb/contracts';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AdminService } from './admin.service';
import { CreateTeacherNestDto } from './dto/create-teacher.dto';
import { CreateStudentNestDto } from './dto/create-student.dto';
import { AdminResetPasswordNestDto, UpdateUserStatusNestDto } from './dto/update-status.dto';

@ApiTags('Admin Provisioning')
@ApiCookieAuth('darb_session')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('teachers')
  @ApiOperation({ summary: 'Provision a new teacher account and their isolated tenant workspace' })
  async createTeacher(@CurrentUser() admin: UserSummaryDto, @Body() dto: CreateTeacherNestDto) {
    return this.adminService.createTeacher(admin.id, dto);
  }

  @Post('students')
  @ApiOperation({ summary: 'Provision a new student account without personal email requirement' })
  async createStudent(@CurrentUser() admin: UserSummaryDto, @Body() dto: CreateStudentNestDto) {
    return this.adminService.createStudent(admin.id, dto);
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users across the platform with pagination' })
  async listUsers(@Query('page') page: string = '1', @Query('limit') limit: string = '50') {
    return this.adminService.listUsers(parseInt(page, 10) || 1, parseInt(limit, 10) || 50);
  }

  @Patch('users/:userId/status')
  @ApiOperation({ summary: 'Enable or disable a user account' })
  async updateUserStatus(
    @CurrentUser() admin: UserSummaryDto,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateUserStatusNestDto,
  ) {
    return this.adminService.updateUserStatus(admin.id, userId, dto.isActive);
  }

  @Post('users/:userId/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Perform an audited administrator-assisted password reset' })
  async resetPassword(
    @CurrentUser() admin: UserSummaryDto,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: AdminResetPasswordNestDto,
  ) {
    return this.adminService.resetUserPassword(admin.id, userId, dto);
  }
}
