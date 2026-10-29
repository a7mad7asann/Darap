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
import { ExamsService } from './exams.service';
import { SaveAnswerNestDto } from './dto/save-answer.dto';

@ApiTags('Student Exams')
@ApiCookieAuth('darb_session')
@ApiBearerAuth()
@Controller('student')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.STUDENT, UserRole.ADMIN)
export class StudentExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Get('courses/:courseId/exams')
  @ApiOperation({ summary: 'List all published and closed exams for an enrolled course' })
  async getCourseExams(
    @CurrentUser() user: UserSummaryDto,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.examsService.getStudentCourseExams(user.id, courseId);
  }

  @Get('exams/:examId')
  @ApiOperation({ summary: 'Get exam details, attempts history, and active attempt status' })
  async getExamDetails(
    @CurrentUser() user: UserSummaryDto,
    @Param('examId', ParseUUIDPipe) examId: string,
  ) {
    return this.examsService.getStudentExamDetails(user.id, examId);
  }

  @Post('exams/:examId/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start a new timed attempt with server-side countdown deadline' })
  async startAttempt(
    @CurrentUser() user: UserSummaryDto,
    @Param('examId', ParseUUIDPipe) examId: string,
  ) {
    return this.examsService.startExamAttempt(user.id, examId);
  }

  @Get('exam-attempts/:attemptId/questions')
  @ApiOperation({
    summary: 'Get active attempt questions and options with isCorrect securely stripped',
  })
  async getActiveAttemptQuestions(
    @CurrentUser() user: UserSummaryDto,
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
  ) {
    return this.examsService.getActiveAttemptQuestions(user.id, attemptId);
  }

  @Post('exam-attempts/:attemptId/answers')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save/update student answer incrementally in real time' })
  async saveAnswer(
    @CurrentUser() user: UserSummaryDto,
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
    @Body() dto: SaveAnswerNestDto,
  ) {
    return this.examsService.saveAnswer(user.id, attemptId, dto);
  }

  @Post('exam-attempts/:attemptId/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit attempt, execute automatic grading engine, and upsert GradeRecord',
  })
  async submitAttempt(
    @CurrentUser() user: UserSummaryDto,
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
  ) {
    return this.examsService.submitExamAttempt(user.id, attemptId);
  }

  @Get('exam-attempts/:attemptId/review')
  @ApiOperation({ summary: 'Review finished attempt with correct answers and score breakdown' })
  async getAttemptReview(
    @CurrentUser() user: UserSummaryDto,
    @Param('attemptId', ParseUUIDPipe) attemptId: string,
  ) {
    return this.examsService.getAttemptReview(user.id, attemptId, user.role);
  }
}
