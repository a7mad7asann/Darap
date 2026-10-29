import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { UserRole, UserSummaryDto } from '@darb/contracts';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JoinCodesService } from '../join-codes/join-codes.service';
import { LearningService } from './learning.service';
import { FilesService } from '../files/files.service';
import { JoinCourseNestDto } from '../join-codes/dto/join-course.dto';

@ApiTags('Student Learning')
@ApiCookieAuth('darb_session')
@ApiBearerAuth()
@Controller('student')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.STUDENT, UserRole.ADMIN)
export class StudentController {
  constructor(
    private readonly joinCodesService: JoinCodesService,
    private readonly learningService: LearningService,
    private readonly filesService: FilesService,
  ) {}

  @Post('join-courses')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Join an active course using a teacher-provided join code' })
  async joinCourse(
    @CurrentUser() user: UserSummaryDto,
    @Body() dto: JoinCourseNestDto,
    @Req() req: Request,
  ) {
    const ip = req.ip || req.socket.remoteAddress;
    return this.joinCodesService.redeemJoinCode(user.id, dto.code, ip);
  }

  @Get('courses')
  @ApiOperation({ summary: 'List all published courses the student is actively enrolled in' })
  async getEnrolledCourses(@CurrentUser() user: UserSummaryDto) {
    return this.learningService.getStudentEnrolledCourses(user.id);
  }

  @Get('courses/:courseId')
  @ApiOperation({ summary: 'View course details (enforces student enrollment)' })
  async getCourseDetails(
    @CurrentUser() user: UserSummaryDto,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.learningService.getStudentCourseDetails(user.id, courseId);
  }

  @Get('courses/:courseId/lessons')
  @ApiOperation({
    summary: 'List published lessons and completion progress for an enrolled course',
  })
  async getCourseLessons(
    @CurrentUser() user: UserSummaryDto,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.learningService.getStudentCourseLessons(user.id, courseId);
  }

  @Post('lessons/:lessonId/progress')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a lesson as completed' })
  async markProgress(
    @CurrentUser() user: UserSummaryDto,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ) {
    return this.learningService.markLessonProgress(user.id, lessonId, true);
  }

  @Get('files/:fileObjectId/presign-download')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request a time-limited presigned download URL for a lesson attachment (GET)',
  })
  async presignDownloadGet(
    @CurrentUser() user: UserSummaryDto,
    @Param('fileObjectId', ParseUUIDPipe) fileObjectId: string,
  ) {
    return this.filesService.presignStudentDownload(user.id, fileObjectId);
  }

  @Post('files/:fileObjectId/presign-download')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request a time-limited presigned download URL for a lesson attachment (POST)',
  })
  async presignDownload(
    @CurrentUser() user: UserSummaryDto,
    @Param('fileObjectId', ParseUUIDPipe) fileObjectId: string,
  ) {
    return this.filesService.presignStudentDownload(user.id, fileObjectId);
  }
}
