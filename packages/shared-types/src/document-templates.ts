// Author: Robert Massey | Created: 2026-07-13 | Module: @attune-sb/shared-types
// Purpose: SmartMapper contracts — document templates + field coordinate
// mappings. Enterprise duplicated these types in the API service and the
// admin canvas; here they live in ONE place and both sides import them.

// --- Status ---

export enum DocumentTemplateStatus {
  UPLOADED = 'UPLOADED',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  FAILED = 'FAILED',
}

// --- Geometry ---

/** Page size in PDF points (1 pt = 1/72 in). */
export interface PageDimension {
  readonly width: number;
  readonly height: number;
}

// --- Field coordinate mappings ---

/** How a mapping renders on the filled PDF. */
export type MappingRenderMode = 'value' | 'checkmark' | 'highlight';

export interface FieldCoordinateMapping {
  /** The form field ID this mapping belongs to */
  fieldId: string;
  fieldLabel: string;
  /** 0-indexed page number */
  page: number;
  /** X in PDF points from the LEFT edge */
  x: number;
  /** Y in PDF points from the TOP edge (i.e. pageHeight - pdfLibY) */
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  /**
   * Present for option-bearing fields (yesno, radio, checkbox, select,
   * multiselect): which option this position corresponds to.
   */
  answerOption?: string;
  /**
   * Defaults at fill time: 'checkmark' when answerOption is present,
   * otherwise 'value' (stamp the answer text).
   */
  renderMode?: MappingRenderMode;
  /** Hex colour for renderMode='highlight'. Defaults to translucent yellow. */
  highlightColor?: string;
}

// --- API shapes ---

export interface DocumentTemplateSummary {
  readonly id: string;
  readonly name: string;
  readonly status: DocumentTemplateStatus;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly pageCount: number;
  /** Form this template fills (one form per template at v1). */
  readonly formId: string | null;
  readonly formName: string | null;
  readonly mappingCount: number;
  readonly createdAt: string | Date;
  readonly updatedAt: string | Date;
}

export interface DocumentTemplateDetail extends DocumentTemplateSummary {
  readonly pageDimensions: PageDimension[];
  readonly fieldMappings: FieldCoordinateMapping[];
}

/** Accepted upload MIME types. DOCX converts to PDF at processing time. */
export const TEMPLATE_MIME_PDF = 'application/pdf';
export const TEMPLATE_MIME_DOCX =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// --- Auto-mapping (Stage 1 fuzzy match) ---

export type CandidateStatus = 'auto_accept' | 'review';

/** One suggested mapping produced by the Stage 1 auto-mapper. */
export interface CandidateMapping {
  fieldId: string;
  fieldLabel: string;
  /** Raw PDF text the field label was fuzzy-matched to. */
  pdfLabelText: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  answerOption?: string;
  /** Fuzzy match confidence 0-100. */
  confidence: number;
  status: CandidateStatus;
  /** Set when geometric group validation flagged this candidate. */
  validationNote?: string;
}

export interface AutoMapResult {
  candidates: CandidateMapping[];
  /** True when the PDF looks scanned (too little embedded text to match). */
  scannedPdf: boolean;
  stats: {
    totalFields: number;
    autoAccepted: number;
    needsReview: number;
    dropped: number;
  };
  ranAt: string;
}
