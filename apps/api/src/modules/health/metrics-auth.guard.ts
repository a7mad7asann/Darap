import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class MetricsAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expectedToken = this.configService.get<string>('METRICS_AUTH_TOKEN')?.trim();

    // When METRICS_AUTH_TOKEN is not configured or empty, access is unrestricted at application layer.
    // (Ingress-level restrictions for public scraping are documented in operational playbooks.)
    if (!expectedToken) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers['authorization'];

    if (!authHeader || typeof authHeader !== 'string') {
      throw new UnauthorizedException('Metrics authentication required');
    }

    const parts = authHeader.trim().split(/\s+/);
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      throw new UnauthorizedException('Invalid authorization format. Expected Bearer token');
    }

    const providedToken = parts[1];

    // Constant-time comparison to prevent timing side-channel attacks
    const expectedBuffer = Buffer.from(expectedToken, 'utf-8');
    const providedBuffer = Buffer.from(providedToken, 'utf-8');

    const isMatch =
      expectedBuffer.length === providedBuffer.length &&
      crypto.timingSafeEqual(expectedBuffer, providedBuffer);

    if (!isMatch) {
      throw new UnauthorizedException('Invalid metrics authorization token');
    }

    return true;
  }
}
