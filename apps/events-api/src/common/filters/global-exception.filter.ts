import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  requestId?: string;
  timestamp: string;
}

// Catches everything (HttpExceptions and unexpected errors alike) so the API
// never leaks a raw stack trace to a client and every error response has the
// same predictable shape: { statusCode, message, error, path, requestId, timestamp }.
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (typeof body === 'object' && body !== null) {
        const b = body as Record<string, unknown>;
        message = (b.message as string | string[]) ?? exception.message;
        error = (b.error as string) ?? exception.name;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
    }

    const responseBody: ErrorResponseBody = {
      statusCode: status,
      message,
      error,
      path: request.url,
      requestId: request.requestId,
      timestamp: new Date().toISOString(),
    };

    if (status >= 500) {
      this.logger.error(
        `[${request.requestId}] ${request.method} ${request.url} -> ${status}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `[${request.requestId}] ${request.method} ${request.url} -> ${status}: ${message}`,
      );
    }

    response.status(status).json(responseBody);
  }
}
