// Author: Robert Massey | Created: 2026-07-16 | Module: Seed / Library
// Purpose: Shared field + workflow authors for curated library seed modules.

import type {
  FieldDefinition,
  FieldType,
  FormSchema,
  LibraryDocumentRef,
  LibraryTemplateCategory,
  LibraryWorkflowGraph,
  WorkflowEdge,
  WorkflowNode,
} from '@attune-sb/shared-types';

export interface LibrarySeedTemplate {
  readonly slug: string;
  readonly name: string;
  readonly description: string;
  readonly category: LibraryTemplateCategory;
  readonly schema: FormSchema;
  readonly workflow?: LibraryWorkflowGraph;
  /** Bundled pre-mapped PDF blueprint, materialized on clone. */
  readonly document?: LibraryDocumentRef;
}

export interface FieldOptions {
  readonly required?: boolean;
  readonly page?: number;
  readonly config?: Record<string, unknown>;
  readonly description?: string;
  readonly showWhen?: { fieldId: string; operator: 'equals' | 'not_equals'; value: unknown };
}

/** Terse field author — sortOrder comes from array position via fields(). */
export function f(
  id: string,
  type: FieldType,
  label: string,
  opts: FieldOptions = {},
): FieldDefinition {
  return {
    id,
    type,
    label,
    ...(opts.description ? { description: opts.description } : {}),
    required: opts.required ?? false,
    config: opts.config ?? {},
    ...(opts.showWhen
      ? {
          conditionalVisibility: {
            enabled: true,
            rules: [
              {
                fieldId: opts.showWhen.fieldId,
                operator: opts.showWhen.operator,
                value: opts.showWhen.value,
              },
            ],
          },
        }
      : {}),
    sortOrder: 0,
    page: opts.page ?? 1,
  };
}

export function fields(...defs: FieldDefinition[]): FieldDefinition[] {
  return defs.map((d, i) => ({ ...d, sortOrder: i }));
}

/** fill_document → email customer → email owner (chained; no unlabeled fan-out). */
export function fillSendBothWorkflow(opts: {
  name: string;
  customerTo?: string;
  customerSubject: string;
  customerBody: string;
  ownerSubject: string;
  ownerBody: string;
  filename: string;
}): LibraryWorkflowGraph {
  const nodes: WorkflowNode[] = [
    { id: 'n-start', type: 'start', position: { x: 0, y: 0 }, data: {} },
    { id: 'n-fill', type: 'fill_document', position: { x: 220, y: 0 }, data: {} },
    {
      id: 'n-send-customer',
      type: 'send_document',
      position: { x: 440, y: 0 },
      data: {
        to: opts.customerTo ?? '{{customer-email}}',
        subject: opts.customerSubject,
        body: opts.customerBody,
        filename: opts.filename,
      },
    },
    {
      id: 'n-send-owner',
      type: 'send_document',
      position: { x: 660, y: 0 },
      data: {
        to: '',
        subject: opts.ownerSubject,
        body: opts.ownerBody,
        filename: opts.filename,
      },
    },
    { id: 'n-end', type: 'end', position: { x: 880, y: 0 }, data: {} },
  ];
  const edges: WorkflowEdge[] = [
    { id: 'e1', source: 'n-start', target: 'n-fill' },
    { id: 'e2', source: 'n-fill', target: 'n-send-customer' },
    { id: 'e3', source: 'n-send-customer', target: 'n-send-owner' },
    { id: 'e4', source: 'n-send-owner', target: 'n-end' },
  ];
  return { name: opts.name, nodes, edges };
}

/** pdf_generate summary → send_document to one recipient (blank to = owner). */
export function pdfGenerateSendWorkflow(opts: {
  name: string;
  title: string;
  to: string;
  subject: string;
  body: string;
  filename: string;
}): LibraryWorkflowGraph {
  return {
    name: opts.name,
    nodes: [
      { id: 'n-start', type: 'start', position: { x: 0, y: 0 }, data: {} },
      {
        id: 'n-pdf',
        type: 'pdf_generate',
        position: { x: 220, y: 0 },
        data: { title: opts.title },
      },
      {
        id: 'n-send',
        type: 'send_document',
        position: { x: 440, y: 0 },
        data: {
          to: opts.to,
          subject: opts.subject,
          body: opts.body,
          filename: opts.filename,
        },
      },
      { id: 'n-end', type: 'end', position: { x: 660, y: 0 }, data: {} },
    ],
    edges: [
      { id: 'e1', source: 'n-start', target: 'n-pdf' },
      { id: 'e2', source: 'n-pdf', target: 'n-send' },
      { id: 'e3', source: 'n-send', target: 'n-end' },
    ],
  };
}

/** In-app notify + customer acknowledgment email. */
export function notifyAndAckWorkflow(opts: {
  name: string;
  message: string;
  ackTo: string;
  ackSubject: string;
  ackBody: string;
}): LibraryWorkflowGraph {
  return {
    name: opts.name,
    nodes: [
      { id: 'n-start', type: 'start', position: { x: 0, y: 0 }, data: {} },
      {
        id: 'n-notify',
        type: 'notify',
        position: { x: 220, y: 0 },
        data: { message: opts.message },
      },
      {
        id: 'n-ack',
        type: 'email',
        position: { x: 440, y: 0 },
        data: {
          to: opts.ackTo,
          subject: opts.ackSubject,
          body: opts.ackBody,
        },
      },
      { id: 'n-end', type: 'end', position: { x: 660, y: 0 }, data: {} },
    ],
    edges: [
      { id: 'e1', source: 'n-start', target: 'n-notify' },
      { id: 'e2', source: 'n-notify', target: 'n-ack' },
      { id: 'e3', source: 'n-ack', target: 'n-end' },
    ],
  };
}

/** Notify only (internal request forms). */
export function notifyWorkflow(opts: { name: string; message: string }): LibraryWorkflowGraph {
  return {
    name: opts.name,
    nodes: [
      { id: 'n-start', type: 'start', position: { x: 0, y: 0 }, data: {} },
      {
        id: 'n-notify',
        type: 'notify',
        position: { x: 220, y: 0 },
        data: { message: opts.message },
      },
      { id: 'n-end', type: 'end', position: { x: 440, y: 0 }, data: {} },
    ],
    edges: [
      { id: 'e1', source: 'n-start', target: 'n-notify' },
      { id: 'e2', source: 'n-notify', target: 'n-end' },
    ],
  };
}
