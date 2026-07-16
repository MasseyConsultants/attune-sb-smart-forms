// Author: Robert Massey | Created: 2026-07-12 | Module: Common / Tests
// Regression coverage for the Terminus health-check crash: ServiceUnavailableException
// puts an OBJECT in the response body's `error` field, which used to hit
// `.toUpperCase()` and throw, killing the process.

import type { ArgumentsHost } from '@nestjs/common';
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';

import { HttpExceptionFilter } from './http-exception.filter';

interface CapturedResponse {
  statusCode?: number;
  body?: {
    success: boolean;
    error: { code: string; message: string; details?: unknown };
  };
}

function makeHost(captured: CapturedResponse): ArgumentsHost {
  const response = {
    status(code: number) {
      captured.statusCode = code;
      return this;
    },
    json(body: CapturedResponse['body']) {
      captured.body = body;
      return this;
    },
  };
  const request = { method: 'GET', path: '/test' };
  return {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;
}

const opsEvents = { record: jest.fn(), security: jest.fn() };

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reason: structural mock stands in for the Nest provider in unit tests.
    filter = new HttpExceptionFilter(opsEvents as any);
  });

  it('maps a string error label to a SCREAMING_SNAKE code', () => {
    const captured: CapturedResponse = {};
    filter.catch(new BadRequestException('Nope'), makeHost(captured));

    expect(captured.statusCode).toBe(400);
    expect(captured.body?.success).toBe(false);
    expect(captured.body?.error.code).toBe('BAD_REQUEST');
  });

  it('joins array validation messages and surfaces them as details', () => {
    const captured: CapturedResponse = {};
    filter.catch(
      new BadRequestException({ message: ['email must be an email', 'password too short'] }),
      makeHost(captured),
    );

    expect(captured.body?.error.message).toBe('email must be an email; password too short');
    expect(captured.body?.error.details).toEqual(['email must be an email', 'password too short']);
  });

  it('survives a non-string error payload (Terminus health results) without throwing', () => {
    const captured: CapturedResponse = {};
    const terminusStyle = new ServiceUnavailableException({
      statusCode: 503,
      message: 'Service Unavailable Exception',
      error: { redis: { status: 'down', message: 'connection refused' } },
    });

    expect(() => filter.catch(terminusStyle, makeHost(captured))).not.toThrow();
    expect(captured.statusCode).toBe(503);
    expect(captured.body?.error.details).toEqual({
      redis: { status: 'down', message: 'connection refused' },
    });
  });
});
