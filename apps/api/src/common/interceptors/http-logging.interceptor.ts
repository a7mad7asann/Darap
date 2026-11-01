import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { MetricsService } from '../../modules/health/metrics.service';
import { normalizeRouteTemplate, redactString } from '../utils/redaction.util';

@Injectable()
export class HttpLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');
  private readonly isProduction = process.env.NODE_ENV === 'production';

  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpCtx = context.switchToHttp();
    const req = httpCtx.getRequest<Request & { _metricsRecorded?: boolean }>();
    const res = httpCtx.getResponse<Response>();
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const durationMs = Date.now() - start;
          const route = req.route?.path
            ? `${req.baseUrl || ''}${req.route.path}`
            : normalizeRouteTemplate(req.originalUrl || req.url || '/');
          const safeRoute = normalizeRouteTemplate(route);
          const statusCode = res.statusCode || 200;

          req._metricsRecorded = true;
          this.metricsService.recordHttpRequest(req.method, safeRoute, statusCode, durationMs);
          this.logEntry(req, statusCode, durationMs, safeRoute);
        },
        error: (err: any) => {
          const durationMs = Date.now() - start;
          const route = req.route?.path
            ? `${req.baseUrl || ''}${req.route.path}`
            : normalizeRouteTemplate(req.originalUrl || req.url || '/');
          const safeRoute = normalizeRouteTemplate(route);
          const statusCode =
            typeof err?.getStatus === 'function' ? err.getStatus() : err?.statusCode || 500;

          req._metricsRecorded = true;
          this.metricsService.recordHttpRequest(req.method, safeRoute, statusCode, durationMs);
          this.logEntry(req, statusCode, durationMs, safeRoute, err);
        },
      }),
    );
  }

  private logEntry(
    req: Request,
    statusCode: number,
    durationMs: number,
    safeRoute: string,
    err?: any,
  ): void {
    // Avoid spamming stdout in production for high-frequency live health probes unless in error
    const isLiveProbe = safeRoute === '/api/v1/health/live' && statusCode === 200;
    if (isLiveProbe && this.isProduction) {
      return;
    }

    const requestId = req.requestId || (req.headers['x-request-id'] as string) || 'unknown';
    const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    if (this.isProduction) {
      const payload: Record<string, any> = {
        timestamp: new Date().toISOString(),
        level,
        service: 'darb-api',
        environment: process.env.NODE_ENV || 'production',
        requestId,
        method: req.method,
        route: safeRoute,
        statusCode,
        durationMs,
      };

      if (err) {
        payload.error = err.name || 'Error';
        payload.message = redactString(err.message || 'Unknown error');
      }

      const jsonString = JSON.stringify(payload);
      if (level === 'error') {
        process.stderr.write(`${jsonString}\n`);
      } else {
        process.stdout.write(`${jsonString}\n`);
      }
    } else {
      const msg = `[${requestId}] ${req.method} ${safeRoute} ${statusCode} - ${durationMs}ms`;
      if (level === 'error') {
        this.logger.error(msg, err?.stack);
      } else if (level === 'warn') {
        this.logger.warn(msg);
      } else {
        this.logger.log(msg);
      }
    }
  }
}
