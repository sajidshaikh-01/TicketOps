import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(
    @InjectMetric('http_requests_total')
    private readonly requestsCounter: Counter<string>,
    @InjectMetric('http_request_duration_seconds')
    private readonly durationHistogram: Histogram<string>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    if (request.path === '/metrics') {
      return next.handle();
    }

    const start = Date.now();
    const route = request.route?.path || 'unmatched';

    const record = (statusCode: number) => {
      const durationSeconds = (Date.now() - start) / 1000;
      const labels = {
        method: request.method,
        route,
        status_code: String(statusCode),
      };
      this.requestsCounter.inc(labels);
      this.durationHistogram.observe(labels, durationSeconds);
    };

    return next.handle().pipe(
      tap({
        next: () => record(response.statusCode),
        error: (err: unknown) => {
          const status =
            (err as { status?: number; statusCode?: number })?.status ??
            (err as { status?: number; statusCode?: number })?.statusCode ??
            500;
          record(status);
        },
      }),
    );
  }
}
