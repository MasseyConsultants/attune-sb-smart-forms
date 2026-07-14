// Author: Robert Massey | Created: 2026-07-13 | Module: Workflows / Engine
// Purpose: email node — interpolates to/subject/body against run state and
// sends through the branded shell. EMAILS is metered per send (idempotent on
// run+node); at cap the step is SKIPPED and the run continues — an email cap
// must never fail a workflow that also generates documents.
//
// attachDocument: users reach for "Send email" and expect an attach option,
// so the node can attach the run's generated PDF (pdf_generate/fill_document)
// directly — send_document remains for document-first flows. If the toggle is
// on but no document exists yet, the step FAILS with a pointer (a silently
// missing attachment would be worse).

import { Injectable } from '@nestjs/common';
import { Meter } from '@prisma/client';

import type { StepAdapter, StepContext, StepResult } from '../step-adapter.interface';
import { interpolate } from '../template-interpolation';

import { SecureLoggerService } from '@/modules/common/logger/secure-logger.service';
import { BlobStorageService } from '@/modules/common/storage/blob-storage.service';
import { EntitlementsService } from '@/modules/entitlements/entitlements.service';
import { brandEmailShell, escapeHtml } from '@/modules/notifications/email-brand-shell';
import { EmailService } from '@/modules/notifications/email.service';

const DEFAULT_ATTACHMENT_NAME = '{{_date}}_{{_formName}}.pdf';

@Injectable()
export class EmailStepAdapter implements StepAdapter {
  readonly handles = ['email'] as const;

  constructor(
    private readonly email: EmailService,
    private readonly entitlements: EntitlementsService,
    private readonly storage: BlobStorageService,
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

    let attachments: { filename: string; content: Buffer; contentType: string }[] | undefined;
    if (ctx.nodeData['attachDocument'] === true) {
      const documentKey = ctx.state['filledDocumentKey'];
      if (typeof documentKey !== 'string' || !documentKey) {
        return {
          status: 'failed',
          error:
            'Attach document is on, but no PDF exists yet — place a Generate PDF or Fill document node before this email',
        };
      }
      const pdf = await this.storage.download(documentKey);
      const filename = interpolate(DEFAULT_ATTACHMENT_NAME, ctx.state).replace(
        /[^a-zA-Z0-9._-]+/g,
        '_',
      );
      attachments = [{ filename, content: pdf, contentType: 'application/pdf' }];
    }

    await this.email.send({
      to,
      subject,
      html: brandEmailShell({
        title: subject,
        bodyHtml: `<p style="margin:0 0 16px;font-size:14px;color:#334155;white-space:pre-line;">${escapeHtml(body)}</p>`,
        showPoweredBy: removeBranding !== true,
      }),
      ...(attachments ? { attachments } : {}),
    });

    await this.entitlements.consume(ctx.organizationId, Meter.EMAILS, {
      idempotencyKey: `wfemail:${ctx.runId}:${ctx.nodeId}`,
      refType: 'workflowRun',
      refId: ctx.runId,
    });

    return {
      status: 'completed',
      outputData: {
        emailSentTo: to,
        emailSentAt: new Date().toISOString(),
        ...(attachments ? { emailAttachedDocument: true } : {}),
      },
    };
  }
}
