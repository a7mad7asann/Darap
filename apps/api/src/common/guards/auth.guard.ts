import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthService } from '../../modules/auth/auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const cookieName = this.configService.get<string>('COOKIE_NAME') || 'darb_session';

    let token = request.cookies ? request.cookies[cookieName] : null;

    if (!token && request.headers.authorization) {
      const parts = request.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    const session = await this.authService.validateSessionToken(token);
    if (!session) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    // Attach to request
    (request as any).user = session.user;
    (request as any).activeTenant = session.activeTenant;
    (request as any).memberships = session.memberships;

    // Optional tenant override via header if user is a member of that tenant
    const headerTenantId = request.headers['x-tenant-id'];
    if (headerTenantId && typeof headerTenantId === 'string') {
      const matched = session.memberships.find((m) => m.tenantId === headerTenantId);
      if (matched) {
        (request as any).activeTenant = matched;
      }
    }

    return true;
  }
}
