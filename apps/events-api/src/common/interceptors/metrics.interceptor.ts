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

// Records two metrics per HTTP request:
//   http_requests_total          - count, for computing request rate
//   http_request_duration_seconds - histogram, for computing P50/P95/P99 latency
// Both are labeled by the ROUTE PATTERN (e.g. /api/events/:id), never the raw
// URL, to keep label cardinality bounded regardless of traffic volume.
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
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const durationSeconds = (Date.now() - start) / 1000;
        const route = request.route?.path || 'unmatched';
        const labels = {
          method: request.method,
          route,
          status_code: String(response.statusCode),
        };
        this.requestsCounter.inc(labels);
        this.durationHistogram.observe(labels, durationSeconds);
      }),
    );
  }
}
