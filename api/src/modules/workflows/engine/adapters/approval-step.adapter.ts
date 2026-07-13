// Author: Robert Massey | Created: 2026-07-13 | Module: Workflows / Engine
// Purpose: approval node (Growth tier) — the first pausing step. Generates a
// one-shot ApprovalToken (raw token emailed, only its SHA-256 stored), sends
// branded approve/reject links, and returns 'paused' so the orchestrator
// parks the run on this node. The public decision endpoint resumes it.
//
// The approval email is part of the approval feature, not a metered send —
// capping EMAILS must never wedge a run in PAUSED forever.

import { createHash, randomBytes } from 'crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { WorkflowsRepository } from '../../workflows.repository';
import type { StepAdapter, StepContext, StepResult } from '../step-adapter.interface';
import { interpolate } from '../template-interpolation';

import { SecureLoggerService } from '@/modules/common/logger/secure-logger.service';
import { EntitlementsService } from '@/modules/entitlements/entitlements.service';
import { brandEmailShell, escapeHtml } from '@/modules/notifications/email-brand-shell';
import { EmailService } from '@/modules/notifications/email.service';

const DEFAULT_EXPIRY_DAYS = 7;
const MAX_EXPIRY_DAYS = 30;

export function hashApprovalToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}

@Injectable()
export class ApprovalStepAdapter implements StepAdapter {
  readonly handles = ['approval'] as const;

  constructor(
    private readonly repository: WorkflowsRepository,
    private readonly email: EmailService,
    private readonly entitlements: EntitlementsService,
    private readonly config: ConfigService,
    private readonly logger: SecureLoggerService,
  ) {}

  async execute(ctx: StepContext): Promise<StepResult> {
    const to = interpolate(String(ctx.nodeData['to'] ?? ''), ctx.state).trim();
    if (!to || !to.includes('@')) {
      return { status: 'failed', error: 'Approval node has no approver email configured' };
    }

    const message = interpolate(String(ctx.nodeData['message'] ?? ''), ctx.state).trim();
    const expiresDays = this.expiryDays(ctx.nodeData['expiresDays']);
    const expiresAt = new Date(Date.now() + expiresDays * 24 * 60 * 60 * 1000);

    const rawToken = randomBytes(32).toString('hex');
    await this.repository.createApprovalToken({
      tokenHash: hashApprovalToken(rawToken),
      runId: ctx.runId,
      nodeId: ctx.nodeId,
      organizationId: ctx.organizationId,
      assignedTo: to,
      message: message || undefined,
      expiresAt,
    });

    const appUrl = this.config.get<string>('APP_URL', 'http://localhost:3100');
    const baseLink = `${appUrl}/approvals/${rawToken}`;
    const removeBranding = await this.entitlements.checkFeature(
      ctx.organizationId,
      'removeBranding',
    );
    const formName = typeof ctx.state['_formName'] === 'string' ? ctx.state['_formName'] : '';

    await this.email.send({
      to,
      subject: `Approval requested${formName ? `: ${formName}` : ''}`,
      html: brandEmailShell({
        title: 'Your approval is requested',
        bodyHtml: [
          message
            ? `<p style="margin:0 0 16px;font-size:14px;color:#334155;white-space:pre-line;">${escapeHtml(message)}</p>`
            : `<p style="margin:0 0 16px;font-size:14px;color:#334155;">A workflow run is waiting on your decision.</p>`,
          `<p style="margin:0 0 8px;">`,
          `<a href="${baseLink}?decision=approved" style="display:inline-block;padding:10px 24px;margin-right:12px;background:#16a34a;color:#ffffff;border-radius:6px;font-size:14px;font-weight:600;text-decoration:none;">Approve</a>`,
          `<a href="${baseLink}?decision=rejected" style="display:inline-block;padding:10px 24px;background:#dc2626;color:#ffffff;border-radius:6px;font-size:14px;font-weight:600;text-decoration:none;">Reject</a>`,
          `</p>`,
          `<p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">This link expires ${expiresAt.toLocaleDateString()} and can be used once.</p>`,
        ].join(''),
        showPoweredBy: removeBranding !== true,
      }),
    });

    this.logger.log(
      `workflow.approval.requested run=${ctx.runId} node=${ctx.nodeId} expires=${expiresAt.toISOString()}`,
      'ApprovalStepAdapter',
    );

    return { status: 'paused' };
  }

  private expiryDays(raw: unknown): number {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return DEFAULT_EXPIRY_DAYS;
    }
    return Math.min(Math.ceil(parsed), MAX_EXPIRY_DAYS);
  }
}
