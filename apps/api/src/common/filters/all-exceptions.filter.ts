import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorResponseEnvelope } from '@darb/contracts';
import { normalizeRouteTemplate, redactString } from '../utils/redaction.util';
import { MetricsService } from '../../modules/health/metrics.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly metricsService?: MetricsService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { _metricsRecorded?: boolean }>();
    const requestId =
      request.requestId || (request.headers?.['x-request-id'] as string) || 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorName = 'InternalServerError';
    let message: string | string[] = 'An unexpected error occurred';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = redactString(res);
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, any>;
        const rawMessage = obj.message || obj.error || message;
        if (Array.isArray(rawMessage)) {
          message = rawMessage.map((m) => redactString(String(m)));
        } else {
          message = redactString(String(rawMessage));
        }
        errorName = obj.error || exception.name;
      }
    } else if (exception instanceof Error) {
      errorName = exception.name;
      const isProduction = process.env.NODE_ENV === 'production';
      if (!isProduction) {
        message = redactString(exception.message);
      } else {
        message = 'Internal server error';
      }
    }

    const safeRoute = normalizeRouteTemplate(request.url || request.originalUrl || '/');

    // If interceptor did not record metrics (e.g. 404 outside controller scope), record it here
    if (!request._metricsRecorded && this.metricsService) {
      request._metricsRecorded = true;
      this.metricsService.recordHttpRequest(request.method || 'GET', safeRoute, status, 0);
    }

    // Structured logging for production unhandled errors
    if (process.env.NODE_ENV === 'production') {
      const logPayload = {
        timestamp: new Date().toISOString(),
        level: status >= 500 ? 'error' : 'warn',
        service: 'darb-api',
        environment: 'production',
        requestId,
        method: request.method,
        route: safeRoute,
        statusCode: status,
        error: errorName,
        message: Array.isArray(message) ? message.join('; ') : message,
      };
      if (status >= 500) {
        process.stderr.write(`${JSON.stringify(logPayload)}\n`);
      } else {
        process.stdout.write(`${JSON.stringify(logPayload)}\n`);
      }
    } else {
      if (status >= 500) {
        this.logger.error(
          `[Request ${requestId}] Unhandled exception: ${
            exception instanceof Error ? redactString(exception.message) : 'Unknown'
          }`,
          exception instanceof Error ? exception.stack : undefined,
        );
      }
    }

    const errorResponse: ApiErrorResponseEnvelope = {
      success: false,
      statusCode: status,
      error: errorName,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId,
    };

    response.status(status).json(errorResponse);
  }
}
