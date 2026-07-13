// Author: Robert Massey | Created: 2026-07-13 | Module: Workflows / Engine
// Purpose: BullMQ worker for workflow runs — executes never inline in a
// request. The orchestrator is idempotent per run (PENDING-only), so BullMQ
// retries and replays are safe.

import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import { WorkflowOrchestratorService } from './workflow-orchestrator.service';

import { SecureLoggerService } from '@/modules/common/logger/secure-logger.service';

export const WORKFLOW_QUEUE = 'workflow-runs';
export const EXECUTE_RUN_JOB = 'execute-run';

export interface WorkflowRunJobData {
  readonly runId: string;
}

@Processor(WORKFLOW_QUEUE)
export class WorkflowRunProcessor extends WorkerHost {
  constructor(
    private readonly orchestrator: WorkflowOrchestratorService,
    private readonly logger: SecureLoggerService,
  ) {
    super();
  }

  async process(job: Job<WorkflowRunJobData>): Promise<void> {
    this.logger.log(`workflow.job.start run=${job.data.runId}`, 'WorkflowRunProcessor');
    await this.orchestrator.execute(job.data.runId);
  }
}
