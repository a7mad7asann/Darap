import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole, UserSummaryDto } from '@darb/contracts';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AssignmentsService } from './assignments.service';
import { FilesService } from '../files/files.service';
import { SubmitAssignmentNestDto } from './dto/submit-assignment.dto';
import { PresignUploadNestDto } from '../files/dto/presign-upload.dto';
import { CompleteUploadNestDto } from '../files/dto/complete-upload.dto';

@ApiTags('Student Assignments')
@ApiCookieAuth('darb_session')
@ApiBearerAuth()
@Controller('student')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.STUDENT, UserRole.ADMIN)
export class StudentAssignmentsController {
  constructor(
    private readonly assignmentsService: AssignmentsService,
    private readonly filesService: FilesService,
  ) {}

  @Get('courses/:courseId/assignments')
  @ApiOperation({ summary: 'List all published and closed assignments for an enrolled course' })
  async getCourseAssignments(
    @CurrentUser() user: UserSummaryDto,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.assignmentsService.getStudentCourseAssignments(user.id, courseId);
  }

  @Get('assignments/:assignmentId')
  @ApiOperation({
    summary: 'Get assignment details and personal submission state for an enrolled student',
  })
  async getAssignmentDetails(
    @CurrentUser() user: UserSummaryDto,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
  ) {
    return this.assignmentsService.getStudentAssignmentDetails(user.id, assignmentId);
  }

  @Post('assignments/:assignmentId/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit assignment solution with text and/or verified file attachments',
  })
  async submitAssignment(
    @CurrentUser() user: UserSummaryDto,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Body() dto: SubmitAssignmentNestDto,
  ) {
    return this.assignmentsService.submitAssignment(user.id, assignmentId, dto);
  }

  @Post('assignments/:assignmentId/files/presign-upload')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate presigned S3 upload URL for an assignment submission attachment',
  })
  async presignUpload(
    @CurrentUser() user: UserSummaryDto,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Body() dto: PresignUploadNestDto,
  ) {
    return this.filesService.presignSubmissionFileUpload(user.id, assignmentId, dto);
  }

  @Post('assignments/:assignmentId/files/complete-upload')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm completed file upload and register FileObject' })
  async completeUpload(
    @CurrentUser() user: UserSummaryDto,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @Body() dto: CompleteUploadNestDto,
  ) {
    return this.filesService.completeSubmissionFileUpload(user.id, assignmentId, dto);
  }

  @Get('submission-attachments/:fileId/presign-download')
  @ApiOperation({
    summary: 'Generate presigned download URL for student own submission attachment (GET)',
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
    summary: 'Generate presigned download URL for student own submission attachment (POST)',
  })
  async presignDownloadPost(
    @CurrentUser() user: UserSummaryDto,
    @Param('fileId', ParseUUIDPipe) fileId: string,
  ) {
    return this.filesService.presignSubmissionAttachmentDownload(user.id, user.role, fileId);
  }
}
