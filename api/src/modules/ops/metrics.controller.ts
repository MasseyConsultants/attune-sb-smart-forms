// Author: Robert Massey | Created: 2026-07-16 | Module: Ops / Metrics
// Purpose: Prometheus scrape endpoint (pull model, ADR-0006). @Public() opts
// out of JWT because scrapers are machines, but access still requires the
// METRICS_TOKEN shared secret — the endpoint 404s when the token is not
// configured so nothing is ever exposed by default.

import { timingSafeEqual } from 'crypto';

import {
  Controller,
  Get,
  Headers,
  NotFoundException,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';

import { MetricsService } from './metrics.service';

import { Public } from '@/modules/auth/decorators/public.decorator';

@ApiTags('Ops')
@Public()
@Controller('metrics')
export class MetricsController {
  constructor(
    private readonly metrics: MetricsService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Prometheus exposition (requires METRICS_TOKEN bearer auth)' })
  async scrape(
    @Headers('authorization') authorization: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    const token = this.config.get<string>('METRICS_TOKEN');
    if (!token) {
      throw new NotFoundException();
    }

    const presented = authorization?.replace(/^Bearer\s+/i, '') ?? '';
    if (!this.tokensMatch(presented, token)) {
      throw new UnauthorizedException('Invalid metrics token');
    }

    res.setHeader('Content-Type', this.metrics.prometheusContentType);
    res.send(await this.metrics.prometheusText());
  }

  private tokensMatch(presented: string, expected: string): boolean {
    const a = Buffer.from(presented);
    const b = Buffer.from(expected);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
