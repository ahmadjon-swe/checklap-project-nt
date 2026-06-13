import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Logs one line per HTTP request with method, path, status and duration.
 * Gives basic request-level observability without pulling in a logging stack.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();

    const http = context.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const { method, originalUrl } = req;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(
            `${method} ${originalUrl} ${res.statusCode} ${Date.now() - start}ms`,
          );
        },
        error: (err) => {
          const status = err?.status ?? 500;
          this.logger.error(
            `${method} ${originalUrl} ${status} ${Date.now() - start}ms - ${err?.message}`,
          );
        },
      }),
    );
  }
}
