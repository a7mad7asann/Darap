import { Controller, Get, Headers, HttpStatus, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { HealthService } from './health.service';
import { MetricsService } from './metrics.service';
import { MetricsAuthGuard } from './metrics-auth.guard';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    private readonly metricsService: MetricsService,
  ) {}

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe to confirm service process is alive' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service is alive',
    schema: {
      example: {
        status: 'ok',
        uptime: 12.34,
        timestamp: '2026-11-01T12:00:00.000Z',
        memoryUsage: { rss: 12345678, heapTotal: 8765432, heapUsed: 6543210 },
      },
    },
  })
  getLive() {
    const memory = process.memoryUsage();
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      memoryUsage: {
        rss: memory.rss,
        heapTotal: memory.heapTotal,
        heapUsed: memory.heapUsed,
      },
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
    const dbHealth = await this.healthService.checkDatabaseHealth();
    if (dbHealth.status === 'up') {
      return {
        status: 'ready',
        database: 'connected',
        checks: {
          database: 'up',
        },
        durationMs: dbHealth.latencyMs,
        timestamp: new Date().toISOString(),
      };
    } else {
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
      return {
        status: 'not_ready',
        database: 'disconnected',
        checks: {
          database: 'down',
        },
        error: 'Database connection failed',
        durationMs: dbHealth.latencyMs,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('dependencies')
  @ApiOperation({
    summary: 'Dependency health probe for database and object storage',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Dependencies operational or non-critical degradation flagged',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Critical dependency (database) unavailable',
  })
  async getDependencies(@Res({ passthrough: true }) res: Response) {
    const overallStart = Date.now();
    const [dbHealth, storageHealth] = await Promise.all([
      this.healthService.checkDatabaseHealth(),
      this.healthService.checkStorageHealth(),
    ]);

    const isDbUp = dbHealth.status === 'up';
    const isStorageUp = storageHealth.status === 'up';

    let overallStatus: 'ok' | 'degraded' | 'down' = 'ok';
    if (!isDbUp) {
      overallStatus = 'down';
      res.status(HttpStatus.SERVICE_UNAVAILABLE);
    } else if (!isStorageUp) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - overallStart,
      dependencies: {
        database: {
          status: dbHealth.status,
          latencyMs: dbHealth.latencyMs,
          ...(dbHealth.error ? { error: dbHealth.error } : {}),
        },
        storage: {
          status: storageHealth.status,
          provider: storageHealth.provider,
          latencyMs: storageHealth.latencyMs,
          ...(storageHealth.details ? { details: storageHealth.details } : {}),
        },
      },
    };
  }

  @Get('metrics')
  @UseGuards(MetricsAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lightweight operational metrics in JSON or Prometheus format',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Operational metrics snapshot',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Authentication required when METRICS_AUTH_TOKEN is configured',
  })
  getMetrics(
    @Query('format') format: string | undefined,
    @Headers('accept') acceptHeader: string | undefined,
    @Res() res: Response,
  ) {
    const wantsPrometheus =
      format === 'prometheus' ||
      (typeof acceptHeader === 'string' &&
        acceptHeader.includes('text/plain') &&
        !acceptHeader.includes('application/json'));

    if (wantsPrometheus) {
      const output = this.metricsService.toPrometheusFormat();
      res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      return res.send(output);
    }

    const snapshot = this.metricsService.getMetricsSnapshot();
    const requestId = (res.req as any)?.requestId || 'unknown';
    return res.json({
      success: true,
      data: snapshot,
      timestamp: new Date().toISOString(),
      requestId,
    });
  }
}
