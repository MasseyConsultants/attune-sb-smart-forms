// Author: Robert Massey | Created: 2026-07-13 | Module: Workflows / Engine
// Purpose: fill_document node — SmartMapper fill inside a workflow. If the
// trigger submission was already filled at intake (S6 inline path), the
// existing PDF is reused with no second DOC_FILLS charge; otherwise the fill
// is rendered here, metered idempotently on run+node. At cap the step is
// SKIPPED (run continues) — consistent with the intake fill's cap behavior.

import type { FieldCoordinateMapping } from '@attune-sb/shared-types';
import { Injectable } from '@nestjs/common';
import { Meter } from '@prisma/client';

import { WorkflowsRepository } from '../../workflows.repository';
import type { StepAdapter, StepContext, StepResult } from '../step-adapter.interface';

import { SecureLoggerService } from '@/modules/common/logger/secure-logger.service';
import { BlobStorageService } from '@/modules/common/storage/blob-storage.service';
import { DocumentFillsRepository } from '@/modules/document-fills/document-fills.repository';
import { renderFilledPdf } from '@/modules/document-fills/pdf-filler';
import { DocumentTemplatesRepository } from '@/modules/document-templates/document-templates.repository';
import { EntitlementsService } from '@/modules/entitlements/entitlements.service';

@Injectable()
export class FillDocumentStepAdapter implements StepAdapter {
  readonly handles = ['fill_document'] as const;

  constructor(
    private readonly templates: DocumentTemplatesRepository,
    private readonly submissions: DocumentFillsRepository,
    private readonly storage: BlobStorageService,
    private readonly entitlements: EntitlementsService,
    private readonly workflows: WorkflowsRepository,
    private readonly logger: SecureLoggerService,
  ) {}

  async execute(ctx: StepContext): Promise<StepResult> {
    const formId = String(ctx.state['_formId'] ?? '');
    const submissionId = String(ctx.state['_submissionId'] ?? '');
    if (!formId) {
      return {
        status: 'failed',
        error: 'No form in run state — fill_document needs a form trigger',
      };
    }

    // Reuse the intake fill when it exists — same document, no double charge.
    if (submissionId) {
      const existing = await this.submissions.findSubmission(submissionId, ctx.organizationId);
      if (existing?.filledDocumentKey) {
        return {
          status: 'completed',
          outputData: {
            filledDocumentKey: existing.filledDocumentKey,
            filledDocumentReused: true,
          },
        };
      }
    }

    const template = await this.templates.findReadyByFormId(formId, ctx.organizationId);
    if (!template) {
      return {
        status: 'failed',
        error: 'No READY document template is linked to the trigger form',
      };
    }
    const mappings = (template.fieldMappings ?? []) as unknown as FieldCoordinateMapping[];
    if (mappings.length === 0) {
      return { status: 'failed', error: 'The linked template has no field mappings' };
    }

    const meter = await this.entitlements.getMeterState(ctx.organizationId, Meter.DOC_FILLS);
    if (meter.used >= meter.limit) {
      this.logger.warn(
        `workflow.fill.skipped_at_cap run=${ctx.runId} node=${ctx.nodeId} (${meter.used}/${meter.limit})`,
        'FillDocumentStepAdapter',
      );
      return {
        status: 'skipped',
        error: `DOC_FILLS plan limit reached (${meter.used}/${meter.limit})`,
      };
    }

    const formData = (ctx.state['formData'] ?? {}) as Record<string, unknown>;
    const templateBytes = await this.storage.download(template.pdfKey);
    const filled = await renderFilledPdf(templateBytes, mappings, formData);

    const key = `workflow-artifacts/${ctx.organizationId}/${ctx.runId}/${ctx.nodeId}.pdf`;
    await this.storage.upload(key, filled, 'application/pdf');
    // Artifact bytes feed the STORAGE_BYTES live sum (S8 carry-over from S7).
    await this.workflows.addRunArtifactBytes(ctx.runId, filled.length);

    await this.entitlements.consume(ctx.organizationId, Meter.DOC_FILLS, {
      idempotencyKey: `docfill:run:${ctx.runId}:${ctx.nodeId}`,
      refType: 'workflowRun',
      refId: ctx.runId,
    });

    return {
      status: 'completed',
      outputData: {
        filledDocumentKey: key,
        filledDocumentBytes: filled.length,
        filledDocumentGeneratedAt: new Date().toISOString(),
      },
    };
  }
}
