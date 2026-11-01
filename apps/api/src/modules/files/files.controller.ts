import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import { UserSummaryDto, TenantMembershipDto } from '@darb/contracts';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import { FilesService } from './files.service';

@ApiTags('Files')
@ApiCookieAuth()
@UseGuards(AuthGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get(':fileId/metadata')
  @ApiOperation({ summary: 'Retrieve authorized file metadata' })
  @ApiResponse({ status: 200, description: 'File metadata retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden: unauthorized file access' })
  @ApiResponse({ status: 404, description: 'Not Found: file does not exist' })
  async getMetadata(
    @Param('fileId', ParseUUIDPipe) fileId: string,
    @CurrentUser() user: UserSummaryDto,
    @CurrentTenant() activeTenant?: TenantMembershipDto,
  ) {
    const metadata = await this.filesService.getFileMetadata(
      user.id,
      user.role,
      activeTenant?.tenantId || null,
      fileId,
    );
    return metadata;
  }
}
