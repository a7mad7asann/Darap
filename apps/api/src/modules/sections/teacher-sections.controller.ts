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
import { SectionsService } from './sections.service';
import { CreateSectionNestDto } from './dto/create-section.dto';
import { UpdateSectionNestDto } from './dto/update-section.dto';
import { ReorderSectionsNestDto } from './dto/reorder-sections.dto';

@ApiTags('Teacher Sections')
@ApiCookieAuth('darb_session')
@ApiBearerAuth()
@Controller('teacher')
@UseGuards(AuthGuard, RolesGuard, TenantGuard)
@Roles(UserRole.TEACHER, UserRole.ADMIN)
export class TeacherSectionsController {
  constructor(private readonly sectionsService: SectionsService) {}

  @Post('courses/:courseId/sections')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new course section/unit' })
  async createSection(
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @CurrentUser() user: UserSummaryDto,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: CreateSectionNestDto,
  ) {
    return this.sectionsService.createSection(
      activeTenant.tenantId,
      user.id,
      courseId,
      dto,
      user.role,
    );
  }

  @Get('courses/:courseId/sections')
  @ApiOperation({ summary: 'List all sections of a course with nested lessons' })
  async getCourseSections(
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @Param('courseId', ParseUUIDPipe) courseId: string,
  ) {
    return this.sectionsService.getCourseSections(activeTenant.tenantId, courseId);
  }

  @Patch('sections/:sectionId')
  @ApiOperation({ summary: 'Update a course section' })
  async updateSection(
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @CurrentUser() user: UserSummaryDto,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
    @Body() dto: UpdateSectionNestDto,
  ) {
    return this.sectionsService.updateSection(
      activeTenant.tenantId,
      user.id,
      sectionId,
      dto,
      user.role,
    );
  }

  @Delete('sections/:sectionId')
  @ApiOperation({ summary: 'Delete a course section (detaches lessons safely)' })
  async deleteSection(
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @CurrentUser() user: UserSummaryDto,
    @Param('sectionId', ParseUUIDPipe) sectionId: string,
  ) {
    return this.sectionsService.deleteSection(activeTenant.tenantId, user.id, sectionId, user.role);
  }

  @Post('courses/:courseId/sections/reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reorder sections within a course' })
  async reorderSections(
    @CurrentTenant() activeTenant: TenantMembershipDto,
    @CurrentUser() user: UserSummaryDto,
    @Param('courseId', ParseUUIDPipe) courseId: string,
    @Body() dto: ReorderSectionsNestDto,
  ) {
    return this.sectionsService.reorderSections(
      activeTenant.tenantId,
      user.id,
      courseId,
      dto,
      user.role,
    );
  }
}
