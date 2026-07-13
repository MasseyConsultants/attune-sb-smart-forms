// Author: Robert Massey | Created: 2026-07-13 | Module: Workflows / Engine
// Purpose: export node (Growth tier) — builds a CSV of the trigger
// submission's formData and emails it as an attachment. EMAILS is metered
// (idempotent on run+node); at cap the step is SKIPPED and the run continues.

import { Injectable } from '@nestjs/common';
import { Meter } from '@prisma/client';

import type { StepAdapter, StepContext, StepResult } from '../step-adapter.interface';
import { interpolate } from '../template-interpolation';

import { SecureLoggerService } from '@/modules/common/logger/secure-logger.service';
import { EntitlementsService } from '@/modules/entitlements/entitlements.service';
import { brandEmailShell } from '@/modules/notifications/email-brand-shell';
import { EmailService } from '@/modules/notifications/email.service';

function csvCell(value: unknown): string {
  const text = Array.isArray(value) ? value.join('; ') : String(value ?? '');
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function buildSubmissionCsv(
  formData: Record<string, unknown>,
  meta: { formName?: string; submittedAt?: string },
): string {
  const rows: string[] = ['Field,Value'];
  if (meta.formName) {
    rows.push(`Form,${csvCell(meta.formName)}`);
  }
  if (meta.submittedAt) {
    rows.push(`Submitted at,${csvCell(meta.submittedAt)}`);
  }
  for (const [key, value] of Object.entries(formData)) {
    rows.push(`${csvCell(key)},${csvCell(value)}`);
  }
  return rows.join('\r\n');
}

@Injectable()
export class ExportStepAdapter implements StepAdapter {
  readonly handles = ['export'] as const;

  constructor(
    private readonly email: EmailService,
    private readonly entitlements: EntitlementsService,
    private readonly logger: SecureLoggerService,
  ) {}

  async execute(ctx: StepContext): Promise<StepResult> {
    const to = interpolate(String(ctx.nodeData['to'] ?? ''), ctx.state).trim();
    if (!to || !to.includes('@')) {
      return { status: 'failed', error: 'Export node has no recipient email configured' };
    }

    const meter = await this.entitlements.getMeterState(ctx.organizationId, Meter.EMAILS);
    if (meter.used >= meter.limit) {
      this.logger.warn(
        `workflow.export.skipped_at_cap run=${ctx.runId} node=${ctx.nodeId} (${meter.used}/${meter.limit})`,
        'ExportStepAdapter',
      );
      return {
        status: 'skipped',
        error: `EMAILS plan limit reached (${meter.used}/${meter.limit})`,
      };
    }

    const formData = (ctx.state['formData'] ?? {}) as Record<string, unknown>;
    const formName = typeof ctx.state['_formName'] === 'string' ? ctx.state['_formName'] : '';
    const csv = buildSubmissionCsv(formData, {
      formName: formName || undefined,
      submittedAt:
        typeof ctx.state['_submittedAt'] === 'string' ? ctx.state['_submittedAt'] : undefined,
    });

    const filename = `${(formName || 'submission').replace(/[^a-z0-9-_ ]/gi, '').trim() || 'submission'}-export.csv`;
    const removeBranding = await this.entitlements.checkFeature(
      ctx.organizationId,
      'removeBranding',
    );

    await this.email.send({
      to,
      subject: `Submission export${formName ? `: ${formName}` : ''}`,
      html: brandEmailShell({
        title: 'Submission export',
        bodyHtml: `<p style="margin:0 0 16px;font-size:14px;color:#334155;">The submission export you requested is attached as a CSV file.</p>`,
        showPoweredBy: removeBranding !== true,
      }),
      attachments: [{ filename, content: Buffer.from(csv, 'utf-8'), contentType: 'text/csv' }],
    });

    await this.entitlements.consume(ctx.organizationId, Meter.EMAILS, {
      idempotencyKey: `wfexport:${ctx.runId}:${ctx.nodeId}`,
      refType: 'workflowRun',
      refId: ctx.runId,
    });

    return {
      status: 'completed',
      outputData: { exportSentTo: to, exportFilename: filename },
    };
  }
}
