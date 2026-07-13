// Author: Robert Massey | Created: 2026-07-13 | Module: Document Fills
// Purpose: Generates the filled PDF for a submission whose form has a mapped
// SmartMapper template. Runs inline on the public intake path AFTER the
// submission row is stored, so a fill failure can never lose customer data.
//
// Metering: DOC_FILLS is asserted before rendering and consumed after upload
// (idempotent on the submission id). At cap the fill is SKIPPED — never the
// submission. The gap is visible in the UI (no download link + usage banner)
// and closes on upgrade for future submissions; skipped fills are not
// retroactively generated at v1.

import { FieldCoordinateMapping } from '@attune-sb/shared-types';
import { Injectable, NotFoundException } from '@nestjs/common';
import { Meter } from '@prisma/client';

import { DocumentFillsRepository } from './document-fills.repository';
import { renderFilledPdf } from './pdf-filler';

import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { SecureLoggerService } from '@/modules/common/logger/secure-logger.service';
import { BlobStorageService } from '@/modules/common/storage/blob-storage.service';
import { DocumentTemplatesRepository } from '@/modules/document-templates/document-templates.repository';
import { EntitlementsService } from '@/modules/entitlements/entitlements.service';

export interface FillRequest {
  readonly submissionId: string;
  readonly formId: string;
  readonly organizationId: string;
  readonly data: Record<string, unknown>;
}

@Injectable()
export class DocumentFillsService {
  constructor(
    private readonly repository: DocumentFillsRepository,
    private readonly templates: DocumentTemplatesRepository,
    private readonly storage: BlobStorageService,
    private readonly entitlements: EntitlementsService,
    private readonly logger: SecureLoggerService,
  ) {}

  /**
   * Generate + store the filled PDF for a fresh submission. Never throws —
   * intake must succeed regardless of what happens here.
   */
  async fillForSubmission(request: FillRequest): Promise<void> {
    const { submissionId, formId, organizationId } = request;
    try {
      const template = await this.templates.findReadyByFormId(formId, organizationId);
      if (!template) {
        return;
      }

      const mappings = (template.fieldMappings ?? []) as unknown as FieldCoordinateMapping[];
      if (mappings.length === 0) {
        return;
      }

      const meter = await this.entitlements.getMeterState(organizationId, Meter.DOC_FILLS);
      if (meter.used >= meter.limit) {
        this.logger.warn(
          `document_fill.skipped_at_cap submission=${submissionId} org=${organizationId} (${meter.used}/${meter.limit})`,
          'DocumentFillsService',
        );
        return;
      }

      const templateBytes = await this.storage.download(template.pdfKey);
      const filled = await renderFilledPdf(templateBytes, mappings, request.data);

      const key = `document-fills/${organizationId}/${submissionId}.pdf`;
      await this.storage.upload(key, filled, 'application/pdf');
      await this.repository.setFilledDocument(submissionId, key, filled.length);

      await this.entitlements.consume(organizationId, Meter.DOC_FILLS, {
        idempotencyKey: `docfill:${submissionId}`,
        refType: 'submission',
        refId: submissionId,
      });

      this.logger.log(
        `document_fill.completed submission=${submissionId} template=${template.id} bytes=${filled.length}`,
        'DocumentFillsService',
      );
    } catch (err) {
      this.logger.error(
        `document_fill.failed submission=${submissionId}: ${err instanceof Error ? err.message : String(err)}`,
        undefined,
        'DocumentFillsService',
      );
    }
  }

  /** Filled PDF bytes for the authenticated download endpoint. */
  async getFilledPdf(
    submissionId: string,
    user: AuthenticatedUser,
  ): Promise<{ buffer: Buffer; filename: string }> {
    const submission = await this.repository.findSubmission(submissionId, user.organizationId);
    if (!submission || !submission.filledDocumentKey) {
      throw new NotFoundException('No filled document for this submission');
    }
    return {
      buffer: await this.storage.download(submission.filledDocumentKey),
      filename: `submission-${submissionId.slice(0, 8)}.pdf`,
    };
  }
}
