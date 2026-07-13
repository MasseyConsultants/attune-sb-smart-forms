// Author: Robert Massey | Created: 2026-07-13 | Module: Workflows / Engine
// Purpose: notify node — alerts the org itself (vs `email`, which targets the
// outside world). SMB has no in-app notification center at v1 (backlog), so
// notify resolves to the org owner's email unless the node overrides `to`.
// Deliberately NOT metered against EMAILS: an org being told about its own
// workflow activity shouldn't burn its outbound-email allowance.

import { Injectable } from '@nestjs/common';

import type { StepAdapter, StepContext, StepResult } from '../step-adapter.interface';
import { interpolate } from '../template-interpolation';

import { EntitlementsRepository } from '@/modules/entitlements/entitlements.repository';
import { EntitlementsService } from '@/modules/entitlements/entitlements.service';
import { brandEmailShell, escapeHtml } from '@/modules/notifications/email-brand-shell';
import { EmailService } from '@/modules/notifications/email.service';

@Injectable()
export class NotifyStepAdapter implements StepAdapter {
  readonly handles = ['notify'] as const;

  constructor(
    private readonly email: EmailService,
    private readonly entitlements: EntitlementsService,
    private readonly entitlementsRepository: EntitlementsRepository,
  ) {}

  async execute(ctx: StepContext): Promise<StepResult> {
    let to = interpolate(String(ctx.nodeData['to'] ?? ''), ctx.state).trim();
    if (!to) {
      const owner = await this.entitlementsRepository.findOwnerEmail(ctx.organizationId);
      to = owner?.email ?? '';
    }
    if (!to) {
      return { status: 'failed', error: 'notify node found no recipient (no org owner email)' };
    }

    const title = interpolate(String(ctx.nodeData['title'] ?? 'Workflow notification'), ctx.state);
    const body = interpolate(String(ctx.nodeData['body'] ?? ''), ctx.state);
    const removeBranding = await this.entitlements.checkFeature(
      ctx.organizationId,
      'removeBranding',
    );

    await this.email.send({
      to,
      subject: title,
      html: brandEmailShell({
        title,
        bodyHtml: `<p style="margin:0 0 16px;font-size:14px;color:#334155;white-space:pre-line;">${escapeHtml(body)}</p>`,
        showPoweredBy: removeBranding !== true,
      }),
    });

    return {
      status: 'completed',
      outputData: { notifiedTo: to, notifiedAt: new Date().toISOString() },
    };
  }
}
