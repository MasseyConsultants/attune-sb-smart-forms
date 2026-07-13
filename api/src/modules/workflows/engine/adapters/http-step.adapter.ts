// Author: Robert Massey | Created: 2026-07-13 | Module: Workflows / Engine
// Purpose: webhook + api nodes (Growth tier) — POSTs run state (or a custom
// interpolated body) to a customer URL. Every request passes the SSRF guard;
// responses are size- and time-capped so a slow or hostile endpoint cannot
// stall the worker or balloon run state.

import { Injectable } from '@nestjs/common';

import { assertUrlSafe } from '../ssrf-protection';
import type { StepAdapter, StepContext, StepResult } from '../step-adapter.interface';
import { interpolate } from '../template-interpolation';

import { SecureLoggerService } from '@/modules/common/logger/secure-logger.service';

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RESPONSE_BYTES = 256 * 1024;
const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

@Injectable()
export class HttpStepAdapter implements StepAdapter {
  readonly handles = ['webhook', 'api'] as const;

  constructor(private readonly logger: SecureLoggerService) {}

  async execute(ctx: StepContext): Promise<StepResult> {
    const rawUrl = interpolate(String(ctx.nodeData['url'] ?? ''), ctx.state).trim();
    if (!rawUrl) {
      return { status: 'failed', error: 'HTTP node has no URL configured' };
    }

    try {
      await assertUrlSafe(rawUrl);
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'URL failed SSRF validation';
      this.logger.warn(
        `workflow.http.blocked run=${ctx.runId} node=${ctx.nodeId}: ${reason}`,
        'HttpStepAdapter',
      );
      return { status: 'failed', error: reason };
    }

    const method = this.method(ctx.nodeData['method']);
    const headers: Record<string, string> = { 'content-type': 'application/json' };
    const customHeaders = ctx.nodeData['headers'];
    if (customHeaders && typeof customHeaders === 'object' && !Array.isArray(customHeaders)) {
      for (const [key, value] of Object.entries(customHeaders as Record<string, unknown>)) {
        if (!/^(host|content-length)$/i.test(key)) {
          headers[key] = interpolate(String(value), ctx.state);
        }
      }
    }

    let body: string | undefined;
    if (method !== 'GET') {
      const template = ctx.nodeData['body'];
      body =
        typeof template === 'string' && template.trim()
          ? interpolate(template, ctx.state)
          : JSON.stringify({ formData: ctx.state['formData'] ?? {}, ...this.metaOf(ctx.state) });
    }

    try {
      const response = await fetch(rawUrl, {
        method,
        headers,
        body,
        redirect: 'error', // a redirect could bounce us into private space
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      const responseBody = await this.readCapped(response);
      const output = {
        [`http_${ctx.nodeId}`]: {
          statusCode: response.status,
          response: this.parseMaybeJson(responseBody),
        },
      };
      if (!response.ok) {
        return {
          status: 'failed',
          outputData: output,
          error: `HTTP ${response.status} from ${new URL(rawUrl).hostname}`,
        };
      }
      return { status: 'completed', outputData: output };
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Request failed';
      return { status: 'failed', error: `HTTP request failed: ${reason}` };
    }
  }

  private method(raw: unknown): (typeof ALLOWED_METHODS)[number] {
    const candidate = String(raw ?? 'POST').toUpperCase();
    return (ALLOWED_METHODS as readonly string[]).includes(candidate)
      ? (candidate as (typeof ALLOWED_METHODS)[number])
      : 'POST';
  }

  private metaOf(state: Record<string, unknown>): Record<string, unknown> {
    return {
      formName: state['_formName'],
      submissionId: state['_submissionId'],
      submittedAt: state['_submittedAt'],
    };
  }

  private async readCapped(response: Response): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) {
      return '';
    }
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        chunks.push(value.subarray(0, value.byteLength - (total - MAX_RESPONSE_BYTES)));
        break;
      }
      chunks.push(value);
    }
    return Buffer.concat(chunks).toString('utf-8');
  }

  private parseMaybeJson(body: string): unknown {
    try {
      return JSON.parse(body) as unknown;
    } catch {
      return body;
    }
  }
}
