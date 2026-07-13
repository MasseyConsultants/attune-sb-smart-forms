// Author: Robert Massey | Created: 2026-07-13 | Module: Workflows / Engine
// Purpose: The submission → workflow bridge. Called from public intake AFTER
// the submission row is stored; never throws — a workflow problem can never
// lose a submission (the same rule document fills follow).
//
// Metering: WORKFLOW_RUNS is checked per workflow before enqueue. At cap the
// run is recorded as SKIPPED_LIMIT — visible in the runs list with an upgrade
// path, never silently dropped. Consumption happens at enqueue (idempotent on
// the run id), not at execution, so a crashed worker can't double-charge.

import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Meter, Prisma, WorkflowRunStatus } from '@prisma/client';
import { Queue } from 'bullmq';

import { WorkflowsRepository } from '../workflows.repository';

import { EXECUTE_RUN_JOB, WORKFLOW_QUEUE, WorkflowRunJobData } from './workflow.processor';

import { SecureLoggerService } from '@/modules/common/logger/secure-logger.service';
import { EntitlementsService } from '@/modules/entitlements/entitlements.service';

export interface SubmissionTrigger {
  readonly submissionId: string;
  readonly formId: string;
  readonly formName: string;
  readonly organizationId: string;
  readonly data: Record<string, unknown>;
}

@Injectable()
export class WorkflowTriggerService {
  constructor(
    private readonly repository: WorkflowsRepository,
    private readonly entitlements: EntitlementsService,
    @InjectQueue(WORKFLOW_QUEUE) private readonly queue: Queue<WorkflowRunJobData>,
    private readonly logger: SecureLoggerService,
  ) {}

  /** Enqueue runs for every published workflow bound to the form. Never throws. */
  async onSubmissionAccepted(trigger: SubmissionTrigger): Promise<void> {
    try {
      const workflows = await this.repository.findPublishedByTriggerForm(
        trigger.formId,
        trigger.organizationId,
      );
      for (const workflow of workflows) {
        await this.startRun(workflow.id, workflow.version, trigger);
      }
    } catch (err) {
      this.logger.error(
        `workflow.trigger.failed submission=${trigger.submissionId}: ${err instanceof Error ? err.message : String(err)}`,
        undefined,
        'WorkflowTriggerService',
      );
    }
  }

  private async startRun(
    workflowId: string,
    workflowVersion: number,
    trigger: SubmissionTrigger,
  ): Promise<void> {
    const state: Record<string, unknown> = {
      formData: trigger.data,
      _formId: trigger.formId,
      _formName: trigger.formName,
      _submissionId: trigger.submissionId,
      _submittedAt: new Date().toISOString(),
    };

    const meter = await this.entitlements.getMeterState(
      trigger.organizationId,
      Meter.WORKFLOW_RUNS,
    );
    if (meter.used >= meter.limit) {
      await this.repository.createRun({
        workflowId,
        workflowVersion,
        organizationId: trigger.organizationId,
        status: WorkflowRunStatus.SKIPPED_LIMIT,
        state: state as Prisma.InputJsonValue,
        triggerType: 'submission',
        submissionId: trigger.submissionId,
        error: `WORKFLOW_RUNS plan limit reached (${meter.used}/${meter.limit})`,
      });
      this.logger.warn(
        `workflow.run.skipped_at_cap workflow=${workflowId} submission=${trigger.submissionId} (${meter.used}/${meter.limit})`,
        'WorkflowTriggerService',
      );
      return;
    }

    const run = await this.repository.createRun({
      workflowId,
      workflowVersion,
      organizationId: trigger.organizationId,
      status: WorkflowRunStatus.PENDING,
      state: state as Prisma.InputJsonValue,
      triggerType: 'submission',
      submissionId: trigger.submissionId,
    });

    await this.entitlements.consume(trigger.organizationId, Meter.WORKFLOW_RUNS, {
      idempotencyKey: `wfrun:${run.id}`,
      refType: 'workflowRun',
      refId: run.id,
    });

    await this.queue.add(EXECUTE_RUN_JOB, { runId: run.id });
    this.logger.log(
      `workflow.run.enqueued run=${run.id} workflow=${workflowId} submission=${trigger.submissionId}`,
      'WorkflowTriggerService',
    );
  }
}
