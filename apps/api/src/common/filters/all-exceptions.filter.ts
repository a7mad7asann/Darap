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

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = request.requestId || 'unknown';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorName = 'InternalServerError';
    let message: string | string[] = 'An unexpected error occurred';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, any>;
        message = obj.message || obj.error || message;
        errorName = obj.error || exception.name;
      }
    } else if (exception instanceof Error) {
      errorName = exception.name;
      // In production or safe modes, NEVER leak internal DB or driver messages
      const isProduction = process.env.NODE_ENV === 'production';
      if (!isProduction) {
        message = exception.message;
      } else {
        message = 'Internal server error';
      }
      this.logger.error(
        `[Request ${requestId}] Unhandled exception: ${exception.message}`,
        exception.stack,
      );
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
