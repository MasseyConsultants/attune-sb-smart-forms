// Author: Robert Massey | Created: 2026-07-13 | Module: AutoMapper
// Purpose: Stage 1 free auto-mapping pipeline, ported from enterprise.
//   Stage 0 (scanned detection) → Stage 1 (extract + fuzzy match + checkbox
//   grouping) → GroupValidator → CandidateMapping[].
//
// No AI calls at v1 — zero recurring cost. Stage 2 (vision, BYOK) is SB-005;
// OCR for scanned PDFs is SB-010. Scanned PDFs get `scannedPdf: true` and an
// empty candidate list so the UI can explain "manual mapping only".

import type { AutoMapResult, CandidateMapping, FormSchema } from '@attune-sb/shared-types';
import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentTemplateStatus } from '@prisma/client';
import * as fuzzball from 'fuzzball';

import { DocumentTemplatesRepository } from '../document-templates.repository';

import { extractLabels, type LabelCandidate } from './extract';
import {
  detectAnswerOptionLabel,
  fuzzyMatchFields,
  normalizeLabel,
  type FormFieldInput,
} from './fuzzy-match';
import {
  GroupValidatorService,
  type AnswerOption,
  type GroupEntry,
} from './group-validator.service';

import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { SecureLoggerService } from '@/modules/common/logger/secure-logger.service';
import { BlobStorageService } from '@/modules/common/storage/blob-storage.service';
import { FormsRepository } from '@/modules/forms/forms.repository';

// --- Field type constants ---

const NON_MAPPABLE_TYPES = new Set(['section', 'pagebreak', 'thankyou', 'calculated']);
const YESNO_TYPES = new Set(['yesno', 'toggle']);

// --- Checkbox proximity constants ---

/** Max vertical distance (pt) for an option label to be on the same row as the question. */
const CHECKBOX_LABEL_V_TOLERANCE = 8;
/** Max horizontal lookahead (pt) from the end of the question label. */
const CHECKBOX_LABEL_H_LOOKAHEAD = 200;
/** Max span (pt) between first and last checkbox option. */
const CHECKBOX_GROUP_MAX_SPAN = 250;
/** Minimum field-label fuzzy score to locate a yes/no question on the page. */
const YESNO_MIN_LABEL_SCORE = 55;
/** Default box dimension (pt) when detected candidate dimensions are unreliable. */
const DEFAULT_BOX_DIM = 10;

// --- Service ---

@Injectable()
export class AutoMapperService {
  constructor(
    private readonly templates: DocumentTemplatesRepository,
    private readonly forms: FormsRepository,
    private readonly storage: BlobStorageService,
    private readonly validator: GroupValidatorService,
    private readonly logger: SecureLoggerService,
  ) {}

  /** Stage 1 free fuzzy-match pipeline — no AI, no cost. */
  async suggestMappings(templateId: string, user: AuthenticatedUser): Promise<AutoMapResult> {
    const start = Date.now();
    const orgId = user.organizationId;

    const template = await this.templates.findById(templateId, orgId);
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    if (template.status !== DocumentTemplateStatus.READY) {
      throw new ConflictException('Template is not ready');
    }
    if (!template.formId) {
      throw new ConflictException('Link the template to a form before auto-mapping');
    }

    const form = await this.forms.findById(template.formId, orgId);
    if (!form) {
      throw new NotFoundException('Linked form not found');
    }

    // --- Stage 0: extract + scanned-PDF detection ---
    const pdfBuffer = await this.storage.download(template.pdfKey);
    const { candidates, avgItemsPerPage, likelyScanned } = await extractLabels(pdfBuffer);

    // --- Load mappable form fields ---
    const schema = (form.schema ?? { fields: [] }) as unknown as FormSchema;
    const allMappableFields: FormFieldInput[] = (schema.fields ?? [])
      .filter((f) => !NON_MAPPABLE_TYPES.has(f.type))
      .map((f) => ({ id: f.id, label: f.label, type: f.type }));

    const totalFields = allMappableFields.length;

    if (likelyScanned || totalFields === 0 || candidates.length === 0) {
      this.logger.log(
        `auto-mapper.stage1.empty template=${templateId} fields=${totalFields} candidates=${candidates.length} avgItems=${avgItemsPerPage.toFixed(1)} likelyScanned=${likelyScanned}`,
        'AutoMapperService',
      );
      return this.emptyResult(totalFields, likelyScanned);
    }

    // --- Stage 1a: fuzzy match standard (non-yesno) fields ---
    const standardFields = allMappableFields.filter((f) => !YESNO_TYPES.has(f.type));
    const yesnoFields = allMappableFields.filter((f) => YESNO_TYPES.has(f.type));

    const fuzzyResults = fuzzyMatchFields(candidates, standardFields);

    const candidateMappings: CandidateMapping[] = fuzzyResults.map((r) => ({
      fieldId: r.field.id,
      fieldLabel: r.field.label,
      pdfLabelText: r.candidate.text,
      page: r.candidate.page,
      x: this.suggestFillX(r.candidate),
      y: this.suggestFillY(r.candidate),
      width: this.suggestFillWidth(r.candidate),
      height: 12,
      confidence: r.score,
      status: r.status,
    }));

    // --- Stage 1b: yes/no/na checkbox group detection ---
    const checkboxCandidates: CandidateMapping[] = [];
    const validationGroups = new Map<string, GroupEntry[]>();

    // Fuzzy pass on yesno fields so we can surface the matched PDF label text.
    const yesnoFuzzyResults = fuzzyMatchFields(candidates, yesnoFields);
    const yesnoPdfLabelMap = new Map(yesnoFuzzyResults.map((r) => [r.field.id, r.candidate.text]));

    for (const field of yesnoFields) {
      const group = this.detectYesNoGroup(field, candidates);
      if (!group) {
        continue;
      }

      validationGroups.set(
        field.id,
        group.map((item) => ({
          fieldId: field.id,
          answerOption: item.answerOption,
          page: item.page,
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
        })),
      );

      const pdfLabelText = yesnoPdfLabelMap.get(field.id) ?? field.label;

      for (const item of group) {
        checkboxCandidates.push({
          fieldId: field.id,
          fieldLabel: field.label,
          pdfLabelText,
          page: item.page,
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
          answerOption: item.answerOption,
          confidence: item.confidence,
          status: item.confidence >= 88 ? 'auto_accept' : 'review',
        });
      }
    }

    // --- GroupValidator pass ---
    const validationResults = this.validator.validateAll(validationGroups);
    for (const c of checkboxCandidates) {
      const vr = validationResults.get(c.fieldId);
      if (vr && !vr.valid) {
        c.status = 'review';
        c.validationNote = vr.reasons.join('; ');
      }
    }

    const allCandidates = [...candidateMappings, ...checkboxCandidates];
    const autoAccepted = allCandidates.filter((c) => c.status === 'auto_accept').length;
    const needsReview = allCandidates.filter((c) => c.status === 'review').length;

    this.logger.log(
      `auto-mapper.stage1.complete template=${templateId} fields=${totalFields} ` +
        `candidates=${allCandidates.length} autoAccepted=${autoAccepted} ` +
        `review=${needsReview} avgItems=${avgItemsPerPage.toFixed(1)} ms=${Date.now() - start}`,
      'AutoMapperService',
    );

    return {
      candidates: allCandidates,
      scannedPdf: likelyScanned,
      stats: {
        totalFields,
        autoAccepted,
        needsReview,
        dropped: totalFields - autoAccepted - needsReview,
      },
      ranAt: new Date().toISOString(),
    };
  }

  // --- Placement helpers ---

  // Labels ending in ':' / '-' / '_' get the fill box to their RIGHT;
  // everything else gets it directly BELOW the label.

  private suggestFillX(c: LabelCandidate): number {
    return /[:\-_]\s*$/.test(c.text) ? c.x + c.width + 4 : c.x;
  }

  private suggestFillY(c: LabelCandidate): number {
    return /[:\-_]\s*$/.test(c.text) ? c.y : c.y + c.height + 2;
  }

  private suggestFillWidth(c: LabelCandidate): number {
    return Math.min(Math.max(c.width, 80), 200);
  }

  // --- Yes/No/NA group detection ---

  private detectYesNoGroup(
    field: FormFieldInput,
    candidates: LabelCandidate[],
  ): Array<{
    answerOption: AnswerOption;
    page: number;
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  }> | null {
    const normField = normalizeLabel(field.label);

    // Locate the question label on the PDF
    const nonCheckboxes = candidates.filter((c) => !c.isCheckbox);
    let bestLabel: LabelCandidate | null = null;
    let bestScore = 0;

    for (const c of nonCheckboxes) {
      const score = fuzzball.token_set_ratio(normField, normalizeLabel(c.text));
      if (score > bestScore) {
        bestScore = score;
        bestLabel = c;
      }
    }

    if (!bestLabel || bestScore < YESNO_MIN_LABEL_SCORE) {
      return null;
    }

    const page = bestLabel.page;
    const labelY = bestLabel.y;
    const labelRight = bestLabel.x + bestLabel.width;

    // Inline layout: Yes / No / N/A on the same row as the question
    const pageCandidates = candidates.filter((c) => c.page === page);
    const optionItems: Array<{ candidate: LabelCandidate; option: AnswerOption }> = [];

    for (const c of pageCandidates) {
      if (Math.abs(c.y - labelY) > CHECKBOX_LABEL_V_TOLERANCE) {
        continue;
      }
      if (c.x < labelRight) {
        continue;
      }
      if (c.x > labelRight + CHECKBOX_LABEL_H_LOOKAHEAD) {
        continue;
      }

      const opt = detectAnswerOptionLabel(c.text);
      if (opt && !optionItems.find((o) => o.option === opt)) {
        optionItems.push({ candidate: c, option: opt });
      }
    }

    if (optionItems.length >= 2) {
      const xs = optionItems.map((o) => o.candidate.x);
      if (Math.max(...xs) - Math.min(...xs) <= CHECKBOX_GROUP_MAX_SPAN) {
        return optionItems.map((o) => ({
          answerOption: o.option,
          page,
          x: o.candidate.x,
          y: o.candidate.y,
          width: Math.min(Math.max(o.candidate.width, DEFAULT_BOX_DIM), 18),
          height: Math.min(Math.max(o.candidate.height, DEFAULT_BOX_DIM), 18),
          confidence: bestScore,
        }));
      }
    }

    // Table-column layout: YES / NO / N/A column headers in a row ABOVE the
    // question — project header x-positions down to the question's row.
    const headerRow = this.findTableAnswerHeaderRow(labelY, pageCandidates);
    if (headerRow) {
      return headerRow.map((h) => ({
        answerOption: h.option,
        page,
        x: h.x,
        y: labelY,
        width: DEFAULT_BOX_DIM,
        height: DEFAULT_BOX_DIM,
        confidence: bestScore,
      }));
    }

    // Block-scan layout: PASS/FAIL at the end of a multi-line description block
    const blockAnswers = this.findBlockAnswerOptions(labelY, pageCandidates);
    if (blockAnswers) {
      return blockAnswers.map((h) => ({
        answerOption: h.option,
        page,
        x: h.x,
        y: h.y,
        width: DEFAULT_BOX_DIM,
        height: DEFAULT_BOX_DIM,
        confidence: bestScore,
      }));
    }

    return null;
  }

  /**
   * Look for a row of YES / NO / N/A column headers that sits ABOVE `questionY`
   * on the same page. Returns the header x-positions when found, or null.
   */
  private findTableAnswerHeaderRow(
    questionY: number,
    pageCandidates: LabelCandidate[],
  ): Array<{ option: AnswerOption; x: number }> | null {
    // Search within 300pt above the question row
    const headerCandidates = pageCandidates.filter((c) => c.y < questionY && c.y > questionY - 300);

    // Group header candidates by approximate y-row (6pt buckets)
    const rows = new Map<number, LabelCandidate[]>();
    for (const c of headerCandidates) {
      const rowKey = Math.round(c.y / 6) * 6;
      const bucket = rows.get(rowKey) ?? [];
      bucket.push(c);
      rows.set(rowKey, bucket);
    }

    for (const rowItems of rows.values()) {
      const found: Array<{ option: AnswerOption; x: number }> = [];
      for (const item of rowItems) {
        const opt = detectAnswerOptionLabel(item.text);
        if (opt && !found.find((f) => f.option === opt)) {
          found.push({ option: opt, x: item.x });
        }
      }
      if (found.length >= 2) {
        return found;
      }
    }

    return null;
  }

  /**
   * Block-scan mode for forms where PASS / FAIL (or YES / NO) appear at the
   * bottom of a multi-line description block, NOT on the question's row.
   * Scans up to 120pt below `labelY` for the first row containing 2+ answer labels.
   */
  private findBlockAnswerOptions(
    labelY: number,
    pageCandidates: LabelCandidate[],
  ): Array<{ option: AnswerOption; x: number; y: number }> | null {
    const MAX_BLOCK_HEIGHT = 120;
    const below = pageCandidates.filter((c) => c.y > labelY && c.y <= labelY + MAX_BLOCK_HEIGHT);

    const rows = new Map<number, LabelCandidate[]>();
    for (const c of below) {
      const key = Math.round(c.y / 6) * 6;
      const bucket = rows.get(key) ?? [];
      bucket.push(c);
      rows.set(key, bucket);
    }

    const sortedKeys = [...rows.keys()].sort((a, b) => a - b);
    for (const key of sortedKeys) {
      const rowItems = rows.get(key) ?? [];
      const found: Array<{ option: AnswerOption; x: number; y: number }> = [];
      for (const item of rowItems) {
        const opt = detectAnswerOptionLabel(item.text);
        if (opt && !found.find((f) => f.option === opt)) {
          found.push({ option: opt, x: item.x, y: item.y });
        }
      }
      if (found.length >= 2) {
        return found;
      }
    }

    return null;
  }

  private emptyResult(totalFields: number, scannedPdf: boolean): AutoMapResult {
    return {
      candidates: [],
      scannedPdf,
      stats: { totalFields, autoAccepted: 0, needsReview: 0, dropped: totalFields },
      ranAt: new Date().toISOString(),
    };
  }
}
