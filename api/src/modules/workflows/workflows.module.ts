// Author: Robert Massey | Created: 2026-07-13 | Module: Workflows
// P4 complete: CRUD + publish FSM, the BullMQ-backed orchestrator with the
// full SMB adapter set (S7 core + S8 Growth: approval, webhook/api, switch,
// data_transform, export), the public approvals surface that resumes paused
// runs, and the submission trigger bridge SubmissionsModule calls on intake.

import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { ApprovalsController } from './approvals.controller';
import { ApprovalsService } from './approvals.service';
import { ApprovalStepAdapter } from './engine/adapters/approval-step.adapter';
import { ConditionStepAdapter } from './engine/adapters/condition-step.adapter';
import { DataTransformStepAdapter } from './engine/adapters/data-transform-step.adapter';
import { EmailStepAdapter } from './engine/adapters/email-step.adapter';
import { ExportStepAdapter } from './engine/adapters/export-step.adapter';
import { FillDocumentStepAdapter } from './engine/adapters/fill-document-step.adapter';
import { HttpStepAdapter } from './engine/adapters/http-step.adapter';
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
  controllers: [WorkflowsController, ApprovalsController],
  providers: [
    WorkflowsRepository,
    WorkflowsService,
    ApprovalsService,
    WorkflowOrchestratorService,
    WorkflowTriggerService,
    WorkflowRunProcessor,
    ConditionStepAdapter,
    EmailStepAdapter,
    PdfGenerateStepAdapter,
    FillDocumentStepAdapter,
    SendDocumentStepAdapter,
    NotifyStepAdapter,
    ApprovalStepAdapter,
    HttpStepAdapter,
    DataTransformStepAdapter,
    ExportStepAdapter,
  ],
  exports: [WorkflowTriggerService],
})
export class WorkflowsModule {}
