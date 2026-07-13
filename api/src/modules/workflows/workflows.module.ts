// Author: Robert Massey | Created: 2026-07-13 | Module: Workflows
// The engine half of P4: CRUD + publish FSM, the BullMQ-backed orchestrator
// with the S7 core adapter set, and the submission trigger bridge that
// SubmissionsModule calls on accepted intake.

import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { ConditionStepAdapter } from './engine/adapters/condition-step.adapter';
import { EmailStepAdapter } from './engine/adapters/email-step.adapter';
import { FillDocumentStepAdapter } from './engine/adapters/fill-document-step.adapter';
import { NotifyStepAdapter } from './engine/adapters/notify-step.adapter';
import { PdfGenerateStepAdapter } from './engine/adapters/pdf-generate-step.adapter';
import { SendDocumentStepAdapter } from './engine/adapters/send-document-step.adapter';
import { WorkflowOrchestratorService } from './engine/workflow-orchestrator.service';
import { WorkflowTriggerService } from './engine/workflow-trigger.service';
import { WORKFLOW_QUEUE, WorkflowRunProcessor } from './engine/workflow.processor';
import { WorkflowsController } from './workflows.controller';
import { WorkflowsRepository } from './workflows.repository';
import { WorkflowsService } from './workflows.service';

import { DocumentFillsModule } from '@/modules/document-fills/document-fills.module';
import { DocumentTemplatesModule } from '@/modules/document-templates/document-templates.module';
import { FormsModule } from '@/modules/forms/forms.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: WORKFLOW_QUEUE }),
    FormsModule,
    DocumentTemplatesModule,
    DocumentFillsModule,
  ],
  controllers: [WorkflowsController],
  providers: [
    WorkflowsRepository,
    WorkflowsService,
    WorkflowOrchestratorService,
    WorkflowTriggerService,
    WorkflowRunProcessor,
    ConditionStepAdapter,
    EmailStepAdapter,
    PdfGenerateStepAdapter,
    FillDocumentStepAdapter,
    SendDocumentStepAdapter,
    NotifyStepAdapter,
  ],
  exports: [WorkflowTriggerService],
})
export class WorkflowsModule {}
