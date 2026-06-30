import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

// Logs one structured line per request: method, path, status, duration_ms,
// request_id. This is the access log; business-logic events (e.g. "booking
// created") are logged separately inside the relevant service.
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const durationMs = Date.now() - start;
        this.logger.log(
          JSON.stringify({
            message: 'request completed',
            request_id: request.requestId,
            method: request.method,
            path: request.originalUrl,
            status_code: response.statusCode,
            duration_ms: durationMs,
          }),
        );
      }),
    );
  }
}
