import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Extends Express's Request type so req.requestId is recognised everywhere
// without `as any` casts.
declare module 'express' {
  interface Request {
    requestId?: string;
  }
}

// Attaches a request ID to every inbound request (reusing one supplied by an
// upstream proxy/ALB via x-request-id if present) and echoes it back on the
// response header. This is what lets us trace a single user action across
// events-api -> bookings-worker -> logs in Grafana/Loki later.
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const incoming = req.header('x-request-id');
    req.requestId = incoming || uuidv4();
    res.setHeader('x-request-id', req.requestId);
    next();
  }
}
