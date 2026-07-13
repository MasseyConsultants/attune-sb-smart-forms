// Author: Robert Massey | Created: 2026-07-12 | Module: Common / Interceptors
// Purpose: Wraps every successful controller response in the platform's standard envelope.
// Controllers return raw data; this interceptor adds { success, data, meta }.
// Ported verbatim from the enterprise edition.

import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface ApiResponseMeta {
  readonly timestamp: string;
  readonly requestId?: string;
}

export interface ApiSuccessResponse<T> {
  readonly success: true;
  readonly data: T;
  readonly meta: ApiResponseMeta;
}

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiSuccessResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccessResponse<T>> {
    const requestId = this.extractRequestId(context);

    return next.handle().pipe(
      map((data) => ({
        success: true as const,
        data,
        meta: {
          timestamp: new Date().toISOString(),
          ...(requestId ? { requestId } : {}),
        },
      })),
    );
  }

  private extractRequestId(context: ExecutionContext): string | undefined {
    const request = context.switchToHttp().getRequest<{ headers?: Record<string, string> }>();
    return request?.headers?.['x-request-id'];
  }
}
