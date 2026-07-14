// Author: Robert Massey | Created: 2026-07-13 | Module: Workflows / Engine
// Purpose: send_document node — emails the PDF produced earlier in the run
// (fill_document or pdf_generate) as an attachment. Local blob storage has no
// presigned URLs, so attaching beats linking for SMB anyway. Metered as an
// email send (idempotent on run+node); cap skips, never fails the run.
// A blank recipient falls back to the org owner (same rule as notify) — "the
// PDF lands in my inbox" is the zero-config default SMBs expect.

import { Injectable } from '@nestjs/common';
import { Meter } from '@prisma/client';

import type { StepAdapter, StepContext, StepResult } from '../step-adapter.interface';
import { interpolate } from '../template-interpolation';

import { SecureLoggerService } from '@/modules/common/logger/secure-logger.service';
import { BlobStorageService } from '@/modules/common/storage/blob-storage.service';
import { EntitlementsRepository } from '@/modules/entitlements/entitlements.repository';
import { EntitlementsService } from '@/modules/entitlements/entitlements.service';
import { brandEmailShell, escapeHtml } from '@/modules/notifications/email-brand-shell';
import { EmailService } from '@/modules/notifications/email.service';

const DEFAULT_FILENAME = '{{_date}}_{{_formName}}.pdf';

@Injectable()
export class SendDocumentStepAdapter implements StepAdapter {
  readonly handles = ['send_document'] as const;

  constructor(
    private readonly email: EmailService,
    private readonly storage: BlobStorageService,
    private readonly entitlements: EntitlementsService,
    private readonly entitlementsRepository: EntitlementsRepository,
    private readonly logger: SecureLoggerService,
  ) {}

  async execute(ctx: StepContext): Promise<StepResult> {
    let to = interpolate(String(ctx.nodeData['to'] ?? ''), ctx.state).trim();
    if (!to) {
      const owner = await this.entitlementsRepository.findOwnerEmail(ctx.organizationId);
      to = owner?.email ?? '';
    }
    if (!to) {
      return {
        status: 'failed',
        error: 'send_document found no recipient (none configured, no org owner email)',
      };
    }

    const stateKey = String(ctx.nodeData['stateKey'] ?? 'filledDocumentKey');
    const documentKey = ctx.state[stateKey];
    if (typeof documentKey !== 'string' || !documentKey) {
      return {
        status: 'failed',
        error: `No document found in run state at "${stateKey}" — place a fill_document or pdf_generate node before send_document`,
      };
    }

    const meter = await this.entitlements.getMeterState(ctx.organizationId, Meter.EMAILS);
    if (meter.used >= meter.limit) {
      this.logger.warn(
        `workflow.send_document.skipped_at_cap run=${ctx.runId} node=${ctx.nodeId} (${meter.used}/${meter.limit})`,
        'SendDocumentStepAdapter',
      );
      return {
        status: 'skipped',
        error: `EMAILS plan limit reached (${meter.used}/${meter.limit})`,
      };
    }

    const pdf = await this.storage.download(documentKey);
    const filename = interpolate(
      String(ctx.nodeData['filename'] ?? DEFAULT_FILENAME),
      ctx.state,
    ).replace(/[^a-zA-Z0-9._-]+/g, '_');

    const subject = interpolate(
      String(ctx.nodeData['subject'] ?? 'Your document from {{_formName}}'),
      ctx.state,
    );
    const body = interpolate(
      String(ctx.nodeData['body'] ?? 'The completed document is attached.'),
      ctx.state,
    );
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
      attachments: [{ filename, content: pdf, contentType: 'application/pdf' }],
    });

    await this.entitlements.consume(ctx.organizationId, Meter.EMAILS, {
      idempotencyKey: `wfemail:${ctx.runId}:${ctx.nodeId}`,
      refType: 'workflowRun',
      refId: ctx.runId,
    });

    return {
      status: 'completed',
      outputData: { documentEmailSentTo: to, documentEmailSentAt: new Date().toISOString() },
    };
  }
}
