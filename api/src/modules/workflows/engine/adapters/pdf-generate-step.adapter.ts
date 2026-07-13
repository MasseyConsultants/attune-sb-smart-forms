// Author: Robert Massey | Created: 2026-07-13 | Module: Workflows / Engine
// Purpose: pdf_generate node — renders a branded submission-summary PDF from
// run state. Deviation from enterprise (Puppeteer HTML→PDF): pdf-lib drawing
// keeps a headless browser out of the run hot path; the layout is a simple
// label/value table, which is what the enterprise "standard" template renders
// anyway. Metered as a document fill (idempotent on run+node).

import { Injectable } from '@nestjs/common';
import { Meter } from '@prisma/client';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

import type { StepAdapter, StepContext, StepResult } from '../step-adapter.interface';
import { interpolate } from '../template-interpolation';

import { SecureLoggerService } from '@/modules/common/logger/secure-logger.service';
import { BlobStorageService } from '@/modules/common/storage/blob-storage.service';
import { sanitizeForWinAnsi } from '@/modules/document-fills/pdf-filler';
import { EntitlementsService } from '@/modules/entitlements/entitlements.service';

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 56;
const BRAND_ORANGE = rgb(0.976, 0.451, 0.086);

function valueToText(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (Array.isArray(value)) {
    return value.map(valueToText).join(', ');
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

@Injectable()
export class PdfGenerateStepAdapter implements StepAdapter {
  readonly handles = ['pdf_generate'] as const;

  constructor(
    private readonly storage: BlobStorageService,
    private readonly entitlements: EntitlementsService,
    private readonly logger: SecureLoggerService,
  ) {}

  async execute(ctx: StepContext): Promise<StepResult> {
    const meter = await this.entitlements.getMeterState(ctx.organizationId, Meter.DOC_FILLS);
    if (meter.used >= meter.limit) {
      this.logger.warn(
        `workflow.pdf_generate.skipped_at_cap run=${ctx.runId} node=${ctx.nodeId} (${meter.used}/${meter.limit})`,
        'PdfGenerateStepAdapter',
      );
      return {
        status: 'skipped',
        error: `DOC_FILLS plan limit reached (${meter.used}/${meter.limit})`,
      };
    }

    const title = interpolate(
      String(ctx.nodeData['title'] ?? '{{_formName}} submission'),
      ctx.state,
    );
    const formData = (ctx.state['formData'] ?? {}) as Record<string, unknown>;

    const pdf = await this.buildSummaryPdf(title, formData);

    const key = `workflow-artifacts/${ctx.organizationId}/${ctx.runId}/${ctx.nodeId}.pdf`;
    await this.storage.upload(key, pdf, 'application/pdf');

    await this.entitlements.consume(ctx.organizationId, Meter.DOC_FILLS, {
      idempotencyKey: `docfill:run:${ctx.runId}:${ctx.nodeId}`,
      refType: 'workflowRun',
      refId: ctx.runId,
    });

    return {
      status: 'completed',
      outputData: {
        pdfKey: key,
        pdfTitle: title,
        pdfSizeBytes: pdf.length,
        pdfGeneratedAt: new Date().toISOString(),
        // send_document defaults to filledDocumentKey; mirror there when a
        // fill hasn't already claimed it so pdf_generate → send_document works.
        ...(ctx.state['filledDocumentKey'] ? {} : { filledDocumentKey: key }),
      },
    };
  }

  private async buildSummaryPdf(title: string, formData: Record<string, unknown>): Promise<Buffer> {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);

    let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;

    // Brand band + title
    page.drawRectangle({
      x: 0,
      y: PAGE_HEIGHT - 8,
      width: PAGE_WIDTH,
      height: 8,
      color: BRAND_ORANGE,
    });
    page.drawText(sanitizeForWinAnsi(title).slice(0, 80), { x: MARGIN, y, size: 18, font: bold });
    y -= 18;
    page.drawText(`Generated ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`, {
      x: MARGIN,
      y,
      size: 9,
      font,
      color: rgb(0.45, 0.5, 0.55),
    });
    y -= 28;

    for (const [fieldId, rawValue] of Object.entries(formData)) {
      const text = sanitizeForWinAnsi(valueToText(rawValue));
      if (!text) {
        continue;
      }
      if (y < MARGIN + 40) {
        page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
      }
      page.drawText(sanitizeForWinAnsi(fieldId).slice(0, 60), {
        x: MARGIN,
        y,
        size: 9,
        font: bold,
        color: rgb(0.3, 0.34, 0.4),
      });
      y -= 13;
      // Naive wrap: 90 chars per line at size 10 within the margins.
      for (let i = 0; i < text.length; i += 90) {
        if (y < MARGIN + 20) {
          page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
          y = PAGE_HEIGHT - MARGIN;
        }
        page.drawText(text.slice(i, i + 90), { x: MARGIN, y, size: 10, font });
        y -= 13;
      }
      y -= 8;
    }

    return Buffer.from(await doc.save());
  }
}
