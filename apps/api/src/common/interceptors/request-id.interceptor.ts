import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response } from 'express';

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

    const headerId = req.headers['x-request-id'];
    const requestId = typeof headerId === 'string' && headerId.trim() !== '' ? headerId : uuidv4();

    req.requestId = requestId;
    res.setHeader('x-request-id', requestId);

    return next.handle();
  }
}
