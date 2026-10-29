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
import { ExamsService } from './exams.service';
import { CreateExamNestDto } from './dto/create-exam.dto';
import { UpdateExamNestDto } from './dto/update-exam.dto';
import { CreateQuestionNestDto } from './dto/create-question.dto';
import { UpdateQuestionNestDto } from './dto/update-question.dto';

@ApiTags('Teacher Exams')
@ApiCookieAuth('darb_session')
@ApiBearerAuth()
@Controller('teacher')
@UseGuards(AuthGuard, RolesGuard, TenantGuard)
@Roles(UserRole.TEACHER, UserRole.ADMIN)
export class TeacherExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Get('courses/:courseId/exams')
  @ApiOperation({ summary: 'List all exams in a course owned by the teacher' })
  async getExams(
    @CurrentUser() user: UserSummaryDto,
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.examsService.getTeacherCourseExams(
      activeTenant.tenantId,
      user.id,
      courseId,
      user.role,
    );
  }

  @Post('courses/:courseId/exams')
  @ApiOperation({ summary: 'Create a new timed multiple-choice exam in draft status' })
  async createExam(
    @CurrentUser() user: UserSummaryDto,
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: CreateExamNestDto,
  ) {
    return this.examsService.createExam(
      activeTenant.tenantId,
      user.id,
      courseId,
      dto,
      user.role,
    );
  }

  @Get('exams/:examId')
  @ApiOperation({ summary: 'Get full exam details including questions and options with correct answers' })
  async getExamDetails(
    @CurrentUser() user: UserSummaryDto,
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @Param('examId', ParseUUIDPipe) examId: string,
  ) {
    return this.examsService.getTeacherExamDetails(
      activeTenant.tenantId,
      user.id,
      examId,
      user.role,
    );
  }

  @Patch('exams/:examId')
  @ApiOperation({ summary: 'Update exam metadata (title, duration, maxAttempts, passingScore)' })
  async updateExam(
    @CurrentUser() user: UserSummaryDto,
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @Param('examId', ParseUUIDPipe) examId: string,
    @Body() dto: UpdateExamNestDto,
  ) {
    return this.examsService.updateExam(
      activeTenant.tenantId,
      user.id,
      examId,
      dto,
      user.role,
    );
  }

  @Post('exams/:examId/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish exam to make it accessible to enrolled students' })
  async publishExam(
    @CurrentUser() user: UserSummaryDto,
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @Param('examId', ParseUUIDPipe) examId: string,
  ) {
    return this.examsService.publishExam(
      activeTenant.tenantId,
      user.id,
      examId,
      user.role,
    );
  }

  @Post('exams/:examId/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Close exam to prevent any new attempts' })
  async closeExam(
    @CurrentUser() user: UserSummaryDto,
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @Param('examId', ParseUUIDPipe) examId: string,
  ) {
    return this.examsService.closeExam(
      activeTenant.tenantId,
      user.id,
      examId,
      user.role,
    );
  }

  @Delete('exams/:examId')
  @ApiOperation({ summary: 'Soft-delete an exam' })
  async deleteExam(
    @CurrentUser() user: UserSummaryDto,
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @Param('examId', ParseUUIDPipe) examId: string,
  ) {
    return this.examsService.deleteExam(
      activeTenant.tenantId,
      user.id,
      examId,
      user.role,
    );
  }

  @Post('exams/:examId/questions')
  @ApiOperation({ summary: 'Add a new multiple-choice question with options' })
  async createQuestion(
    @CurrentUser() user: UserSummaryDto,
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @Param('examId', ParseUUIDPipe) examId: string,
    @Body() dto: CreateQuestionNestDto,
  ) {
    return this.examsService.createQuestion(
      activeTenant.tenantId,
      user.id,
      examId,
      dto,
      user.role,
    );
  }

  @Patch('exams/:examId/questions/:questionId')
  @ApiOperation({ summary: 'Update a question and its options' })
  async updateQuestion(
    @CurrentUser() user: UserSummaryDto,
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @Param('examId', ParseUUIDPipe) examId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
    @Body() dto: UpdateQuestionNestDto,
  ) {
    return this.examsService.updateQuestion(
      activeTenant.tenantId,
      user.id,
      examId,
      questionId,
      dto,
      user.role,
    );
  }

  @Delete('exams/:examId/questions/:questionId')
  @ApiOperation({ summary: 'Delete a question' })
  async deleteQuestion(
    @CurrentUser() user: UserSummaryDto,
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @Param('examId', ParseUUIDPipe) examId: string,
    @Param('questionId', ParseUUIDPipe) questionId: string,
  ) {
    return this.examsService.deleteQuestion(
      activeTenant.tenantId,
      user.id,
      examId,
      questionId,
      user.role,
    );
  }

  @Get('exams/:examId/submissions')
  @ApiOperation({ summary: 'List all student attempts and scores for this exam' })
  async getExamSubmissions(
    @CurrentUser() user: UserSummaryDto,
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @Param('examId', ParseUUIDPipe) examId: string,
  ) {
    return this.examsService.getTeacherExamSubmissions(
      activeTenant.tenantId,
      user.id,
      examId,
      user.role,
    );
  }

  @Get('exam-attempts/:attemptId/review')
  @ApiOperation({ summary: 'Review student attempt answers with correct options' })
  async getAttemptReview(
    @CurrentUser() user: UserSummaryDto,
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
  ) {
    return this.examsService.getAttemptReview(user.id, attemptId, user.role);
  }
}
