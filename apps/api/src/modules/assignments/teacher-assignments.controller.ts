import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TenantMembershipDto, UserRole, UserSummaryDto } from '@darb/contracts';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { AssignmentsService } from './assignments.service';
import { FilesService } from '../files/files.service';
import { CreateAssignmentNestDto } from './dto/create-assignment.dto';
import { UpdateAssignmentNestDto } from './dto/update-assignment.dto';
import { GradeSubmissionNestDto } from './dto/grade-submission.dto';

@ApiTags('Teacher Assignments')
@ApiCookieAuth('darb_session')
@ApiBearerAuth()
@Controller('teacher')
@UseGuards(AuthGuard, RolesGuard, TenantGuard)
@Roles(UserRole.TEACHER, UserRole.ADMIN)
export class TeacherAssignmentsController {
  constructor(
    private readonly assignmentsService: AssignmentsService,
    private readonly filesService: FilesService,
  ) {}

  @Get('courses/:courseId/assignments')
  @ApiOperation({ summary: 'List all assignments for a course owned by the teacher' })
  async getAssignments(
    @CurrentUser() user: UserSummaryDto,
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.assignmentsService.getTeacherCourseAssignments(
      activeTenant.tenantId,
      user.id,
      courseId,
      user.role,
    );
  }

  @Post('courses/:courseId/assignments')
  @ApiOperation({ summary: 'Create a new assignment for a course' })
  async createAssignment(
    @CurrentUser() user: UserSummaryDto,
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: CreateAssignmentNestDto,
  ) {
    return this.assignmentsService.createAssignment(
      activeTenant.tenantId,
      user.id,
      courseId,
      dto,
      user.role,
    );
  }

  @Get('assignments/:assignmentId')
  @ApiOperation({ summary: 'Get full details of an assignment including all submissions' })
  async getAssignmentDetails(
    @CurrentUser() user: UserSummaryDto,
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
  ) {
    return this.assignmentsService.getTeacherAssignmentDetails(
      activeTenant.tenantId,
      user.id,
      assignmentId,
      user.role,
    );
  }

  @Patch('assignments/:assignmentId')
  @ApiOperation({ summary: 'Update assignment title, description, maxScore, dueDate, or status' })
  async updateAssignment(
    @CurrentUser() user: UserSummaryDto,
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Body() dto: UpdateAssignmentNestDto,
  ) {
    return this.assignmentsService.updateAssignment(
      activeTenant.tenantId,
      user.id,
      assignmentId,
      dto,
      user.role,
    );
  }

  @Post('assignments/:assignmentId/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish an assignment to make it available to enrolled students' })
  async publishAssignment(
    @CurrentUser() user: UserSummaryDto,
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
  ) {
    return this.assignmentsService.publishAssignment(
      activeTenant.tenantId,
      user.id,
      assignmentId,
      user.role,
    );
  }

  @Post('assignments/:assignmentId/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close an assignment to stop accepting new student submissions' })
  async closeAssignment(
    @CurrentUser() user: UserSummaryDto,
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
  ) {
    return this.assignmentsService.closeAssignment(
      activeTenant.tenantId,
      user.id,
      assignmentId,
      user.role,
    );
  }

  @Delete('assignments/:assignmentId')
  @ApiOperation({ summary: 'Soft-delete an assignment' })
  async deleteAssignment(
    @CurrentUser() user: UserSummaryDto,
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
  ) {
    return this.assignmentsService.deleteAssignment(
      activeTenant.tenantId,
      user.id,
      assignmentId,
      user.role,
    );
  }

  @Post('submissions/:submissionId/grade')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Grade a student submission with score, feedback, and atomic GradeRecord',
  })
  async gradeSubmission(
    @CurrentUser() user: UserSummaryDto,
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @Param('submissionId', ParseUUIDPipe) submissionId: string,
    @Body() dto: GradeSubmissionNestDto,
  ) {
    return this.assignmentsService.gradeSubmission(
      activeTenant.tenantId,
      user.id,
      submissionId,
      dto,
      user.role,
    );
  }

  @Get('submission-attachments/:fileId/presign-download')
  @ApiOperation({
    summary: 'Generate a presigned download URL for a student submission attachment (GET)',
  })
  async presignDownloadGet(
    @CurrentUser() user: UserSummaryDto,
    @Param('fileId', ParseUUIDPipe) fileId: string,
  ) {
    return this.filesService.presignSubmissionAttachmentDownload(user.id, user.role, fileId);
  }

  @Post('submission-attachments/:fileId/presign-download')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate a presigned download URL for a student submission attachment (POST)',
  })
  async presignDownloadPost(
    @CurrentUser() user: UserSummaryDto,
    @Param('fileId', ParseUUIDPipe) fileId: string,
  ) {
    return this.filesService.presignSubmissionAttachmentDownload(user.id, user.role, fileId);
  }
}
