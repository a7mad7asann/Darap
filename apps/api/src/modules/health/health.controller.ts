import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { PrismaService } from '../../database/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe to confirm service is running' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service is alive',
    schema: {
      example: {
        status: 'ok',
        timestamp: '2026-10-29T12:00:00.000Z',
        uptime: 12.34,
      },
    },
  })
  getLive() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness probe to confirm database connectivity and service readiness',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service and database are ready',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Database or dependencies not ready',
  })
  async getReady(@Res({ passthrough: true }) res: Response) {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ready',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
      return {
        status: 'not_ready',
        database: 'disconnected',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
