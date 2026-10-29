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
import { CoursesService } from './courses.service';
import { LessonsService } from '../lessons/lessons.service';
import { JoinCodesService } from '../join-codes/join-codes.service';
import { CreateCourseNestDto } from './dto/create-course.dto';
import { UpdateCourseNestDto } from './dto/update-course.dto';
import { CreateLessonNestDto } from '../lessons/dto/create-lesson.dto';
import { CreateJoinCodeNestDto } from '../join-codes/dto/create-join-code.dto';

@ApiTags('Teacher Courses')
@ApiCookieAuth('darb_session')
@ApiBearerAuth()
@Controller('teacher/courses')
@UseGuards(AuthGuard, RolesGuard, TenantGuard)
@Roles(UserRole.TEACHER, UserRole.ADMIN)
export class TeacherCoursesController {
  constructor(
    private readonly coursesService: CoursesService,
    private readonly lessonsService: LessonsService,
    private readonly joinCodesService: JoinCodesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'View all courses in the active tenant workspace' })
  async getCourses(
    @CurrentUser() user: UserSummaryDto,
    @CurrentTenant() activeTenant: TenantMembershipDto,
  ) {
    return this.coursesService.getTeacherCourses(activeTenant.tenantId, user.id, user.role);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new course in draft status' })
  async createCourse(
    @CurrentUser() user: UserSummaryDto,
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @Body() dto: CreateCourseNestDto,
  ) {
    return this.coursesService.createCourse(activeTenant.tenantId, user.id, dto);
  }

  @Get(':courseId')
  @ApiOperation({ summary: 'View course details, ordered lessons, and enrolled students' })
  async getCourse(
    @CurrentUser() user: UserSummaryDto,
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.coursesService.getTeacherCourseById(
      activeTenant.tenantId,
      user.id,
      courseId,
      user.role,
    );
  }

  @Patch(':courseId')
  @ApiOperation({ summary: 'Update course details (title, description, subject)' })
  async updateCourse(
    @CurrentUser() user: UserSummaryDto,
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: UpdateCourseNestDto,
  ) {
    return this.coursesService.updateCourse(
      activeTenant.tenantId,
      user.id,
      courseId,
      dto,
      user.role,
    );
  }

  @Post(':courseId/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish course making it available to enrolled students' })
  async publishCourse(
    @CurrentUser() user: UserSummaryDto,
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.coursesService.publishCourse(activeTenant.tenantId, user.id, courseId, user.role);
  }

  @Post(':courseId/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive course' })
  async archiveCourse(
    @CurrentUser() user: UserSummaryDto,
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.coursesService.archiveCourse(activeTenant.tenantId, user.id, courseId, user.role);
  }

  @Post(':courseId/lessons')
  @ApiOperation({ summary: 'Create a lesson in this course' })
  async createLesson(
    @CurrentUser() user: UserSummaryDto,
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: CreateLessonNestDto,
  ) {
    return this.lessonsService.createLesson(
      activeTenant.tenantId,
      user.id,
      courseId,
      dto,
      user.role,
    );
  }

  @Post(':courseId/join-codes')
  @ApiOperation({ summary: 'Generate a new cryptographically secure join code for this course' })
  async generateJoinCode(
    @CurrentUser() user: UserSummaryDto,
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: CreateJoinCodeNestDto,
  ) {
    return this.joinCodesService.generateJoinCode(
      activeTenant.tenantId,
      user.id,
      courseId,
      dto,
      user.role,
    );
  }

  @Get(':courseId/join-codes')
  @ApiOperation({ summary: 'List all join codes issued for this course' })
  async getCourseJoinCodes(
    @CurrentUser() user: UserSummaryDto,
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.joinCodesService.getCourseJoinCodes(
      activeTenant.tenantId,
      user.id,
      courseId,
      user.role,
    );
  }
}
