// Author: Robert Massey | Created: 2026-07-13 | Module: Workflows / Approvals
// Purpose: public token-based approval decisions. The emailed raw token is the
// entire credential: we look it up by SHA-256, enforce single-use + expiry,
// record the decision as the paused node's ledger step, and resume the run
// down the approved/rejected branch. No login, no run state exposure.

import type { ApprovalDecision, ApprovalPublicView } from '@attune-sb/shared-types';
import { GoneException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, WorkflowRunStepStatus } from '@prisma/client';

import { hashApprovalToken } from './engine/adapters/approval-step.adapter';
import { WorkflowOrchestratorService } from './engine/workflow-orchestrator.service';
import { WorkflowsRepository } from './workflows.repository';

import { SecureLoggerService } from '@/modules/common/logger/secure-logger.service';
import { InAppNotificationsService } from '@/modules/notifications/in-app-notifications.service';

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly repository: WorkflowsRepository,
    private readonly orchestrator: WorkflowOrchestratorService,
    private readonly logger: SecureLoggerService,
    private readonly inAppNotifications: InAppNotificationsService,
  ) {}

  /** Landing-page context. Used tokens still render (showing the outcome). */
  async getView(rawToken: string): Promise<ApprovalPublicView> {
    const record = await this.findByRawToken(rawToken);
    if (!record.usedAt && record.expiresAt < new Date()) {
      throw new GoneException('This approval link has expired');
    }
    return {
      workflowName: record.run.workflow.name,
      message: record.message,
      assignedTo: record.assignedTo,
      expiresAt: record.expiresAt.toISOString(),
      decision: (record.decision as ApprovalDecision | null) ?? null,
      decidedAt: record.usedAt?.toISOString() ?? null,
    };
  }

  async decide(rawToken: string, decision: ApprovalDecision, note?: string): Promise<void> {
    const record = await this.findByRawToken(rawToken);
    if (record.usedAt) {
      throw new GoneException('This approval link has already been used');
    }
    if (record.expiresAt < new Date()) {
      throw new GoneException('This approval link has expired');
    }

    await this.repository.markApprovalTokenUsed(record.id, decision, note);

    // The pause recorded no ledger row — the decision IS the approval step's
    // outcome, visible in the runs view as approved/rejected output.
    await this.repository.createRunStep({
      runId: record.runId,
      nodeId: record.nodeId,
      nodeType: 'approval',
      status: WorkflowRunStepStatus.COMPLETED,
      output: {
        decision,
        note: note ?? null,
        decidedBy: record.assignedTo,
        decidedAt: new Date().toISOString(),
      } as Prisma.InputJsonValue,
    });

    this.logger.log(
      `workflow.approval.decided run=${record.runId} node=${record.nodeId} decision=${decision}`,
      'ApprovalsService',
    );

    await this.inAppNotifications.emit({
      organizationId: record.organizationId,
      type: 'approval_decided',
      title: `Approval ${decision} — ${record.run.workflow.name}`,
      body: `${record.assignedTo} ${decision} the request${note ? `: "${note}"` : '.'}`,
      link: `/workflows/${record.run.workflowId}/runs`,
    });

    await this.orchestrator.resume({
      runId: record.runId,
      branchHint: decision,
      resumeData: {
        [`approval_${record.nodeId}`]: {
          decision,
          note: note ?? null,
          decidedBy: record.assignedTo,
        },
      },
    });
  }

  private async findByRawToken(rawToken: string) {
    // 404 for malformed and unknown alike — don't confirm token shape.
    if (!/^[a-f0-9]{64}$/i.test(rawToken)) {
      throw new NotFoundException('Approval link not found');
    }
    const record = await this.repository.findApprovalTokenByHash(hashApprovalToken(rawToken));
    if (!record) {
      throw new NotFoundException('Approval link not found');
    }
    return record;
  }
}
