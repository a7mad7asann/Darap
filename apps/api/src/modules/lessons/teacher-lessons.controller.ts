import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { LessonsService } from './lessons.service';
import { FilesService } from '../files/files.service';
import { UpdateLessonNestDto } from './dto/update-lesson.dto';
import { ReorderLessonsNestDto } from './dto/reorder-lesson.dto';
import { PresignUploadNestDto } from '../files/dto/presign-upload.dto';
import { CompleteUploadNestDto } from '../files/dto/complete-upload.dto';

@ApiTags('Teacher Lessons')
@ApiCookieAuth('darb_session')
@ApiBearerAuth()
@Controller('teacher/lessons')
@UseGuards(AuthGuard, RolesGuard, TenantGuard)
@Roles(UserRole.TEACHER, UserRole.ADMIN)
export class TeacherLessonsController {
  constructor(
    private readonly lessonsService: LessonsService,
    private readonly filesService: FilesService,
  ) {}

  @Patch(':lessonId')
  @ApiOperation({ summary: 'Update lesson title, content, or order index' })
  async updateLesson(
    @CurrentUser() user: UserSummaryDto,
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: UpdateLessonNestDto,
  ) {
    return this.lessonsService.updateLesson(
      activeTenant.tenantId,
      user.id,
      lessonId,
      dto,
      user.role,
    );
  }

  @Delete(':lessonId')
  @ApiOperation({ summary: 'Soft delete a lesson' })
  async deleteLesson(
    @CurrentUser() user: UserSummaryDto,
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ) {
    return this.lessonsService.deleteLesson(activeTenant.tenantId, user.id, lessonId, user.role);
  }

  @Post(':lessonId/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish lesson to make it visible to students' })
  async publishLesson(
    @CurrentUser() user: UserSummaryDto,
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ) {
    return this.lessonsService.publishLesson(activeTenant.tenantId, user.id, lessonId, user.role);
  }

  @Post(':lessonId/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive/unpublish lesson' })
  async archiveLesson(
    @CurrentUser() user: UserSummaryDto,
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ) {
    return this.lessonsService.archiveLesson(activeTenant.tenantId, user.id, lessonId, user.role);
  }

  @Post(':lessonId/reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reorder lessons within the course' })
  async reorderLessons(
    @CurrentUser() user: UserSummaryDto,
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: ReorderLessonsNestDto,
  ) {
    return this.lessonsService.reorderLessons(
      activeTenant.tenantId,
      user.id,
      lessonId,
      dto,
      user.role,
    );
  }

  @Post(':lessonId/files/presign-upload')
  @ApiOperation({ summary: 'Request presigned upload URL to upload document to private storage' })
  async presignUpload(
    @CurrentUser() user: UserSummaryDto,
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: PresignUploadNestDto,
  ) {
    return this.filesService.presignLessonFileUpload(
      activeTenant.tenantId,
      user.id,
      lessonId,
      dto,
      user.role,
    );
  }

  @Post(':lessonId/files/complete-upload')
  @ApiOperation({ summary: 'Complete file upload and attach document to lesson' })
  async completeUpload(
    @CurrentUser() user: UserSummaryDto,
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Body() dto: CompleteUploadNestDto,
  ) {
    return this.filesService.completeLessonFileUpload(
      activeTenant.tenantId,
      user.id,
      lessonId,
      dto,
      user.role,
    );
  }

  @Delete(':lessonId/files/:fileId')
  @ApiOperation({ summary: 'Remove attached file from lesson' })
  async deleteFile(
    @CurrentUser() user: UserSummaryDto,
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @Param('fileId', ParseUUIDPipe) fileId: string,
  ) {
    return this.filesService.deleteLessonFile(
      activeTenant.tenantId,
      user.id,
      lessonId,
      fileId,
      user.role,
    );
  }
}
