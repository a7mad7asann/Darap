import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request, Response } from 'express';
import { sanitizeRequestId } from '../utils/redaction.util';

declare module 'express' {
  interface Request {
    requestId?: string;
  }
}

@Injectable()
export class RequestIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const req = httpContext.getRequest<Request>();
    const res = httpContext.getResponse<Response>();

    const rawHeader = req.headers['x-request-id'];
    const requestId = sanitizeRequestId(rawHeader);

    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);
    res.setHeader('X-Request-Id', requestId);

    return next.handle();
  }
}
