import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request } from 'express';
import { ApiResponseEnvelope } from '@darb/contracts';

@Injectable()
export class TransformResponseInterceptor<T> implements NestInterceptor<T, ApiResponseEnvelope<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponseEnvelope<T>> {
    const req = context.switchToHttp().getRequest<Request>();
    const requestId = req.requestId || 'unknown';

    return next.handle().pipe(
      map((data) => {
        // If data is already enveloped or raw buffer/stream, preserve it
        if (data && typeof data === 'object' && 'success' in data && 'data' in data) {
          return data as ApiResponseEnvelope<T>;
        }

        let message: string | undefined = undefined;
        const payload: any = data;

        if (data && typeof data === 'object' && 'message' in data && 'user' in data) {
          message = (data as any).message;
        }

        return {
          success: true,
          data: payload,
          message,
          timestamp: new Date().toISOString(),
          requestId,
        };
      }),
    );
  }
}
