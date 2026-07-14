// Author: Robert Massey | Created: 2026-07-13 | Module: Workflows / Engine
// Purpose: pdf_generate node — renders a branded submission-summary PDF from
// run state. Deviation from enterprise (Puppeteer HTML→PDF): pdf-lib drawing
// keeps a headless browser out of the run hot path; the layout is a simple
// label/value table, which is what the enterprise "standard" template renders
// anyway. Metered as a document fill (idempotent on run+node).
//
// The trigger form's schema drives the layout: human field labels in form
// order, section headers as dividers, layout-only fields skipped. Answers
// with no schema entry (renamed/removed fields) still print by id — a
// half-labeled PDF beats a silently incomplete one.

import type { FieldDefinition, FormSchema } from '@attune-sb/shared-types';
import { Injectable } from '@nestjs/common';
import { Meter } from '@prisma/client';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

import { WorkflowsRepository } from '../../workflows.repository';
import type { StepAdapter, StepContext, StepResult } from '../step-adapter.interface';
import { interpolate } from '../template-interpolation';

import { SecureLoggerService } from '@/modules/common/logger/secure-logger.service';
import { BlobStorageService } from '@/modules/common/storage/blob-storage.service';
import { sanitizeForWinAnsi } from '@/modules/document-fills/pdf-filler';
import { EntitlementsService } from '@/modules/entitlements/entitlements.service';
import { FormsRepository } from '@/modules/forms/forms.repository';

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 56;
const BRAND_ORANGE = rgb(0.976, 0.451, 0.086);

/** Layout-only field types carry no answer — never print them. */
const DISPLAY_ONLY_TYPES = new Set(['section', 'pagebreak', 'thankyou']);

/** A printable line: section header or label/value pair. */
interface PdfRow {
  readonly kind: 'section' | 'answer';
  readonly label: string;
  readonly value?: string;
}

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

/** Signature/photo fields store data URLs or blob keys — summarize, don't dump. */
function summarizeAnswer(field: FieldDefinition | undefined, raw: unknown): string {
  const text = valueToText(raw);
  if (!text) {
    return '';
  }
  if (field && (field.type === 'signature' || field.type === 'photo')) {
    return text.startsWith('data:') || text.length > 200
      ? `[${field.type === 'signature' ? 'Signed' : 'Photo attached'}]`
      : text;
  }
  return text;
}

/**
 * Orders answers by the form schema (label + section structure). Answers for
 * ids missing from the schema are appended at the end under their raw id.
 */
export function buildPdfRows(
  formData: Record<string, unknown>,
  schema: FormSchema | null,
): PdfRow[] {
  const rows: PdfRow[] = [];
  const consumed = new Set<string>();

  const schemaFields = [...(schema?.fields ?? [])].sort(
    (a, b) => a.page - b.page || a.sortOrder - b.sortOrder,
  );
  let pendingSection: string | null = null;

  for (const field of schemaFields) {
    if (field.type === 'section') {
      pendingSection = field.label;
      continue;
    }
    if (DISPLAY_ONLY_TYPES.has(field.type)) {
      continue;
    }
    const value = summarizeAnswer(field, formData[field.id]);
    consumed.add(field.id);
    if (!value) {
      continue;
    }
    // Only print a section header when it has at least one answered field.
    if (pendingSection !== null) {
      rows.push({ kind: 'section', label: pendingSection });
      pendingSection = null;
    }
    rows.push({ kind: 'answer', label: field.label || field.id, value });
  }

  for (const [fieldId, raw] of Object.entries(formData)) {
    if (consumed.has(fieldId)) {
      continue;
    }
    const value = summarizeAnswer(undefined, raw);
    if (value) {
      rows.push({ kind: 'answer', label: fieldId, value });
    }
  }

  return rows;
}

@Injectable()
export class PdfGenerateStepAdapter implements StepAdapter {
  readonly handles = ['pdf_generate'] as const;

  constructor(
    private readonly storage: BlobStorageService,
    private readonly entitlements: EntitlementsService,
    private readonly repository: WorkflowsRepository,
    private readonly forms: FormsRepository,
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

    const formId = String(ctx.state['_formId'] ?? '');
    const form = formId ? await this.forms.findById(formId, ctx.organizationId) : null;
    const rows = buildPdfRows(formData, (form?.schema ?? null) as FormSchema | null);

    const pdf = await this.buildSummaryPdf(title, rows);

    const key = `workflow-artifacts/${ctx.organizationId}/${ctx.runId}/${ctx.nodeId}.pdf`;
    await this.storage.upload(key, pdf, 'application/pdf');
    // Artifact bytes feed the STORAGE_BYTES live sum (S8 carry-over from S7).
    await this.repository.addRunArtifactBytes(ctx.runId, pdf.length);

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

  private async buildSummaryPdf(title: string, rows: PdfRow[]): Promise<Buffer> {
    const doc = await PDFDocument.create();
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const bold = await doc.embedFont(StandardFonts.HelveticaBold);

    let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;

    const ensureRoom = (needed: number): void => {
      if (y < MARGIN + needed) {
        page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
      }
    };

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

    for (const row of rows) {
      if (row.kind === 'section') {
        ensureRoom(60);
        y -= 6;
        page.drawText(sanitizeForWinAnsi(row.label).slice(0, 70).toUpperCase(), {
          x: MARGIN,
          y,
          size: 10,
          font: bold,
          color: BRAND_ORANGE,
        });
        y -= 4;
        page.drawRectangle({
          x: MARGIN,
          y,
          width: PAGE_WIDTH - MARGIN * 2,
          height: 0.75,
          color: BRAND_ORANGE,
        });
        y -= 16;
        continue;
      }

      const text = sanitizeForWinAnsi(row.value ?? '');
      ensureRoom(40);
      page.drawText(sanitizeForWinAnsi(row.label).slice(0, 80), {
        x: MARGIN,
        y,
        size: 9,
        font: bold,
        color: rgb(0.3, 0.34, 0.4),
      });
      y -= 13;
      // Naive wrap: 90 chars per line at size 10 within the margins.
      for (let i = 0; i < text.length; i += 90) {
        ensureRoom(20);
        page.drawText(text.slice(i, i + 90), { x: MARGIN, y, size: 10, font });
        y -= 13;
      }
      y -= 8;
    }

    return Buffer.from(await doc.save());
  }
}
