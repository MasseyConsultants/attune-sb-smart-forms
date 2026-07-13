// Author: Robert Massey | Created: 2026-07-13 | Module: Workflows / Engine
// Purpose: email node — interpolates to/subject/body against run state and
// sends through the branded shell. EMAILS is metered per send (idempotent on
// run+node); at cap the step is SKIPPED and the run continues — an email cap
// must never fail a workflow that also generates documents.

import { Injectable } from '@nestjs/common';
import { Meter } from '@prisma/client';

import type { StepAdapter, StepContext, StepResult } from '../step-adapter.interface';
import { interpolate } from '../template-interpolation';

import { SecureLoggerService } from '@/modules/common/logger/secure-logger.service';
import { EntitlementsService } from '@/modules/entitlements/entitlements.service';
import { brandEmailShell, escapeHtml } from '@/modules/notifications/email-brand-shell';
import { EmailService } from '@/modules/notifications/email.service';

@Injectable()
export class EmailStepAdapter implements StepAdapter {
  readonly handles = ['email'] as const;

  constructor(
    private readonly email: EmailService,
    private readonly entitlements: EntitlementsService,
    private readonly logger: SecureLoggerService,
  ) {}

  async execute(ctx: StepContext): Promise<StepResult> {
    const to = interpolate(String(ctx.nodeData['to'] ?? ''), ctx.state).trim();
    if (!to) {
      return { status: 'failed', error: 'Email node has no recipient configured' };
    }

    const meter = await this.entitlements.getMeterState(ctx.organizationId, Meter.EMAILS);
    if (meter.used >= meter.limit) {
      this.logger.warn(
        `workflow.email.skipped_at_cap run=${ctx.runId} node=${ctx.nodeId} (${meter.used}/${meter.limit})`,
        'EmailStepAdapter',
      );
      return {
        status: 'skipped',
        error: `EMAILS plan limit reached (${meter.used}/${meter.limit})`,
      };
    }

    const subject = interpolate(
      String(ctx.nodeData['subject'] ?? 'Workflow notification'),
      ctx.state,
    );
    const body = interpolate(String(ctx.nodeData['body'] ?? ''), ctx.state);
    const removeBranding = await this.entitlements.checkFeature(
      ctx.organizationId,
      'removeBranding',
    );

    await this.email.send({
      to,
      subject,
      html: brandEmailShell({
        title: subject,
        bodyHtml: `<p style="margin:0 0 16px;font-size:14px;color:#334155;white-space:pre-line;">${escapeHtml(body)}</p>`,
        showPoweredBy: removeBranding !== true,
      }),
    });

    await this.entitlements.consume(ctx.organizationId, Meter.EMAILS, {
      idempotencyKey: `wfemail:${ctx.runId}:${ctx.nodeId}`,
      refType: 'workflowRun',
      refId: ctx.runId,
    });

    return {
      status: 'completed',
      outputData: { emailSentTo: to, emailSentAt: new Date().toISOString() },
    };
  }
}
