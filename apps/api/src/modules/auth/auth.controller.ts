import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentTenant } from '../../common/decorators/current-tenant.decorator';
import {
  AuthMeResponseDto,
  LoginResponseDto,
  TenantMembershipDto,
  UserSummaryDto,
} from '@darb/contracts';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate with username and password, setting an HTTP-only session cookie',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Authentication successful',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid username or password',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Account locked or rate limit exceeded',
  })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LoginResponseDto> {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await this.authService.login(dto, ip, userAgent);

    const cookieName = this.configService.get<string>('COOKIE_NAME') || 'darb_session';
    const cookieSecure = this.configService.get<boolean>('COOKIE_SECURE') ?? false;
    const cookieSameSite =
      (this.configService.get<string>('COOKIE_SAME_SITE') as 'lax' | 'strict' | 'none') || 'lax';
    const ttlHours = this.configService.get<number>('SESSION_TTL_HOURS') || 24;

    res.cookie(cookieName, result.sessionToken, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
      maxAge: ttlHours * 60 * 60 * 1000,
      path: '/',
    });

    return {
      user: result.user,
      activeTenant: result.activeTenant,
      memberships: result.memberships,
      message: 'Login successful',
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Logout and clear session cookie' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Logout successful',
  })
  async logout(
    @CurrentUser() user: UserSummaryDto,
    @CurrentTenant() activeTenant: TenantMembershipDto | undefined,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookieName = this.configService.get<string>('COOKIE_NAME') || 'darb_session';
    const cookieSecure = this.configService.get<boolean>('COOKIE_SECURE') ?? false;
    const cookieSameSite =
      (this.configService.get<string>('COOKIE_SAME_SITE') as 'lax' | 'strict' | 'none') || 'lax';

    res.clearCookie(cookieName, {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
      path: '/',
    });

    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    await this.authService.logLogout(
      user.id,
      activeTenant ? activeTenant.tenantId : null,
      ip,
      userAgent,
    );

    return {
      message: 'Logged out successfully',
    };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiOperation({
    summary: 'Retrieve authenticated user profile, active tenant, and memberships',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Profile retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  async getMe(
    @CurrentUser() user: UserSummaryDto,
    @CurrentTenant() activeTenant: TenantMembershipDto | undefined,
    @Req() req: Request,
  ): Promise<AuthMeResponseDto> {
    const memberships = ((req as any).memberships as TenantMembershipDto[]) || [];

    return {
      user,
      activeTenant: activeTenant || null,
      memberships,
    };
  }
}
