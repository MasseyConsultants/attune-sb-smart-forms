// Author: Robert Massey | Created: 2026-07-13 | Module: @attune-sb/shared-types
// Purpose: Template library contracts (S9). A library template bundles a form
// schema with an optional workflow graph; cloning materializes both as DRAFTs
// in the caller's org. PUBLIC templates are the curated gallery (also an SEO
// surface); ORG templates are customer-published (publishOrgTemplates gate).

import type { FormSchema } from './forms';
import type { WorkflowEdge, WorkflowNode } from './workflows';

export const LIBRARY_CATEGORIES = [
  'inspections',
  'intake',
  'hr',
  'field-service',
  'events',
  'feedback',
  'orders',
  'legal',
] as const;

export type LibraryTemplateCategory = (typeof LIBRARY_CATEGORIES)[number];

export const LIBRARY_CATEGORY_LABELS: Record<LibraryTemplateCategory, string> = {
  inspections: 'Inspections & Audits',
  intake: 'Client Intake',
  hr: 'HR & Onboarding',
  'field-service': 'Field Service',
  events: 'Events & Registration',
  feedback: 'Feedback & Surveys',
  orders: 'Orders & Requests',
  legal: 'Legal & Consent',
};

export enum LibraryTemplateScope {
  /** Curated by the platform; visible to everyone including logged-out visitors. */
  PUBLIC = 'PUBLIC',
  /** Published by an org for its own members (publishOrgTemplates feature). */
  ORG = 'ORG',
}

/** Optional workflow bundled with a template (cloned as a DRAFT workflow). */
export interface LibraryWorkflowGraph {
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

/**
 * Code-generated, pre-mapped PDF layouts a template can bundle. Cloning
 * materializes the blueprint as a READY DocumentTemplate linked to the new
 * form, so fill_document workflows run with zero setup. Names are stable —
 * the API's blueprint generator switches over them exhaustively.
 */
export const LIBRARY_DOCUMENT_BLUEPRINTS = [
  'contractor-quote',
  'trade-quote',
  'change-order',
  'punch-list',
  'auto-repair-estimate',
  'booking-contract',
  'permission-slip',
  'bakery-order',
  'direct-deposit-auth',
  'service-report',
  'records-release',
] as const;

export type LibraryDocumentBlueprintName = (typeof LIBRARY_DOCUMENT_BLUEPRINTS)[number];

/** Optional document bundle on a library template. */
export interface LibraryDocumentRef {
  blueprint: LibraryDocumentBlueprintName;
}

export interface LibraryTemplateSummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: LibraryTemplateCategory;
  scope: LibraryTemplateScope;
  fieldCount: number;
  pageCount: number;
  hasWorkflow: boolean;
  /** True when the template bundles a pre-mapped PDF document blueprint. */
  hasDocument: boolean;
  installCount: number;
  createdAt: string;
}

export interface LibraryTemplateDetail extends LibraryTemplateSummary {
  schema: FormSchema;
  workflow: LibraryWorkflowGraph | null;
  document: LibraryDocumentRef | null;
}

// --- Requests / responses ---

export interface CloneTemplateResponse {
  formId: string;
  formName: string;
  /** Present when the template bundled a workflow. */
  workflowId: string | null;
  /**
   * Present when the template bundled a document blueprint and it was
   * materialized; null when absent or skipped (uploadedTemplates cap).
   */
  documentTemplateId: string | null;
}

export interface PublishOrgTemplateRequest {
  formId: string;
  name: string;
  description: string;
  category: LibraryTemplateCategory;
  /** Bundle this workflow's current graph with the template. */
  workflowId?: string;
}
