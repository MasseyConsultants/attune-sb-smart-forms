// Author: Robert Massey | Created: 2026-07-13 | Module: Workflows / Tests
// Per-adapter specs: config handling, metering (assert-before/consume-after,
// idempotency keys, at-cap skips), and interpolation against run state.

import { PDFDocument } from 'pdf-lib';

import type { StepContext } from '../step-adapter.interface';

import { ConditionStepAdapter } from './condition-step.adapter';
import { EmailStepAdapter } from './email-step.adapter';
import { FillDocumentStepAdapter } from './fill-document-step.adapter';
import { NotifyStepAdapter } from './notify-step.adapter';
import { PdfGenerateStepAdapter, buildPdfRows } from './pdf-generate-step.adapter';
import { SendDocumentStepAdapter } from './send-document-step.adapter';

const email = { send: jest.fn().mockResolvedValue(undefined) };
const entitlements = {
  getMeterState: jest.fn(),
  consume: jest.fn().mockResolvedValue({}),
  checkFeature: jest.fn().mockResolvedValue(false),
};
const entitlementsRepository = {
  findOwnerEmail: jest.fn().mockResolvedValue({ email: 'owner@acme.test' }),
};
const storage = {
  download: jest.fn(),
  upload: jest.fn().mockResolvedValue(undefined),
};
const templates = { findReadyByFormId: jest.fn() };
const fillsRepository = { findSubmission: jest.fn() };
const workflowsRepository = {
  addRunArtifactBytes: jest.fn().mockResolvedValue({}),
  createApprovalToken: jest.fn().mockResolvedValue({}),
};
const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

function ctx(
  nodeType: string,
  nodeData: Record<string, unknown>,
  state: Record<string, unknown> = {},
): StepContext {
  return {
    runId: 'run-1',
    workflowId: 'wf-1',
    organizationId: 'org-1',
    nodeId: 'n-1',
    nodeType: nodeType as StepContext['nodeType'],
    nodeData,
    state: {
      formData: { name: 'Jane', dept: 'Ops' },
      _formId: 'form-1',
      _formName: 'Intake',
      _submissionId: 'sub-1',
      ...state,
    },
  };
}

async function fixturePdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);
  return Buffer.from(await doc.save());
}

beforeEach(() => {
  jest.clearAllMocks();
  entitlements.getMeterState.mockResolvedValue({ used: 0, limit: 100 });
  entitlements.consume.mockResolvedValue({});
  entitlements.checkFeature.mockResolvedValue(false);
  entitlementsRepository.findOwnerEmail.mockResolvedValue({ email: 'owner@acme.test' });
});

describe('ConditionStepAdapter', () => {
  const adapter = new ConditionStepAdapter();

  it.each([
    ['equals', 'Jane', true],
    ['equals', 'John', false],
    ['not_equals', 'John', true],
    ['contains', 'jan', true],
    ['is_not_empty', undefined, true],
  ])('evaluates %s(%s) → %s', async (operator, value, expected) => {
    const result = await adapter.execute(ctx('condition', { field: 'name', operator, value }));
    expect(result.outputData?.conditionResult).toBe(expected);
  });

  it('compares numbers for greater_than', async () => {
    const result = await adapter.execute(
      ctx(
        'condition',
        { field: 'score', operator: 'greater_than', value: 5 },
        {
          formData: { score: 7 },
        },
      ),
    );
    expect(result.outputData?.conditionResult).toBe(true);
  });

  it('returns the explicit branch target', async () => {
    const result = await adapter.execute(
      ctx('condition', {
        field: 'name',
        operator: 'equals',
        value: 'Jane',
        trueNodeId: 'branch-yes',
        falseNodeId: 'branch-no',
      }),
    );
    expect(result.nextNodeId).toBe('branch-yes');
  });

  it('resolves dotted paths from the state root', async () => {
    const result = await adapter.execute(
      ctx('condition', { field: '_formName', operator: 'equals', value: 'Intake' }),
    );
    expect(result.outputData?.conditionResult).toBe(true);
  });
});

describe('EmailStepAdapter', () => {
  // Reason: structural mocks stand in for Nest providers in unit tests.
  const adapter = new EmailStepAdapter(email as any, entitlements as any, logger as any);

  it('interpolates recipient/subject/body and consumes EMAILS idempotently', async () => {
    const result = await adapter.execute(
      ctx('email', {
        to: '{{formData.name}}@acme.test',
        subject: 'New {{_formName}} submission',
        body: 'From {{formData.name}} ({{formData.dept}})',
      }),
    );

    expect(result.status).toBe('completed');
    expect(email.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'Jane@acme.test', subject: 'New Intake submission' }),
    );
    expect(email.send.mock.calls[0][0].html).toContain('From Jane (Ops)');
    expect(entitlements.consume).toHaveBeenCalledWith('org-1', 'EMAILS', {
      idempotencyKey: 'wfemail:run-1:n-1',
      refType: 'workflowRun',
      refId: 'run-1',
    });
  });

  it('skips (not fails) at the EMAILS cap and does not send or consume', async () => {
    entitlements.getMeterState.mockResolvedValue({ used: 25, limit: 25 });
    const result = await adapter.execute(ctx('email', { to: 'a@b.c' }));

    expect(result.status).toBe('skipped');
    expect(result.error).toContain('EMAILS plan limit reached');
    expect(email.send).not.toHaveBeenCalled();
    expect(entitlements.consume).not.toHaveBeenCalled();
  });

  it('fails when no recipient is configured', async () => {
    const result = await adapter.execute(ctx('email', {}));
    expect(result.status).toBe('failed');
    expect(email.send).not.toHaveBeenCalled();
  });
});

describe('FillDocumentStepAdapter', () => {
  const adapter = new FillDocumentStepAdapter(
    // Reason: structural mocks stand in for Nest providers in unit tests.
    templates as any,
    fillsRepository as any,
    storage as any,
    entitlements as any,
    workflowsRepository as any,
    logger as any,
  );

  it('reuses the intake fill without consuming DOC_FILLS again', async () => {
    fillsRepository.findSubmission.mockResolvedValue({
      filledDocumentKey: 'document-fills/org-1/sub-1.pdf',
    });
    const result = await adapter.execute(ctx('fill_document', {}));

    expect(result.status).toBe('completed');
    expect(result.outputData?.filledDocumentKey).toBe('document-fills/org-1/sub-1.pdf');
    expect(result.outputData?.filledDocumentReused).toBe(true);
    expect(entitlements.consume).not.toHaveBeenCalled();
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('renders + uploads + meters when no intake fill exists', async () => {
    fillsRepository.findSubmission.mockResolvedValue({ filledDocumentKey: null });
    templates.findReadyByFormId.mockResolvedValue({
      pdfKey: 'document-templates/org-1/t1.pdf',
      fieldMappings: [
        { fieldId: 'name', fieldLabel: 'Name', page: 0, x: 100, y: 100, width: 160, height: 20 },
      ],
    });
    storage.download.mockResolvedValue(await fixturePdf());

    const result = await adapter.execute(ctx('fill_document', {}));

    expect(result.status).toBe('completed');
    expect(result.outputData?.filledDocumentKey).toBe('workflow-artifacts/org-1/run-1/n-1.pdf');
    expect(storage.upload).toHaveBeenCalled();
    expect(entitlements.consume).toHaveBeenCalledWith('org-1', 'DOC_FILLS', {
      idempotencyKey: 'docfill:run:run-1:n-1',
      refType: 'workflowRun',
      refId: 'run-1',
    });
  });

  it('skips at the DOC_FILLS cap', async () => {
    fillsRepository.findSubmission.mockResolvedValue({ filledDocumentKey: null });
    templates.findReadyByFormId.mockResolvedValue({
      pdfKey: 'k',
      fieldMappings: [{ fieldId: 'name', page: 0, x: 0, y: 0, width: 10, height: 10 }],
    });
    entitlements.getMeterState.mockResolvedValue({ used: 10, limit: 10 });

    const result = await adapter.execute(ctx('fill_document', {}));

    expect(result.status).toBe('skipped');
    expect(entitlements.consume).not.toHaveBeenCalled();
  });

  it('fails when the trigger form has no READY template', async () => {
    fillsRepository.findSubmission.mockResolvedValue({ filledDocumentKey: null });
    templates.findReadyByFormId.mockResolvedValue(null);

    const result = await adapter.execute(ctx('fill_document', {}));
    expect(result.status).toBe('failed');
    expect(result.error).toContain('No READY document template');
  });
});

describe('SendDocumentStepAdapter', () => {
  const adapter = new SendDocumentStepAdapter(
    // Reason: structural mocks stand in for Nest providers in unit tests.
    email as any,
    storage as any,
    entitlements as any,
    entitlementsRepository as any,
    logger as any,
  );

  it('downloads the state document and emails it as an attachment', async () => {
    const pdf = await fixturePdf();
    storage.download.mockResolvedValue(pdf);

    const result = await adapter.execute(
      ctx(
        'send_document',
        { to: 'client@ext.test', filename: '{{_formName}}.pdf' },
        { filledDocumentKey: 'workflow-artifacts/org-1/run-1/f.pdf' },
      ),
    );

    expect(result.status).toBe('completed');
    expect(storage.download).toHaveBeenCalledWith('workflow-artifacts/org-1/run-1/f.pdf');
    const payload = email.send.mock.calls[0][0];
    expect(payload.attachments).toHaveLength(1);
    expect(payload.attachments[0].filename).toBe('Intake.pdf');
    expect(payload.attachments[0].contentType).toBe('application/pdf');
    expect(entitlements.consume).toHaveBeenCalledWith(
      'org-1',
      'EMAILS',
      expect.objectContaining({ idempotencyKey: 'wfemail:run-1:n-1' }),
    );
  });

  it('fails with a pointer when the state has no document key', async () => {
    const result = await adapter.execute(ctx('send_document', { to: 'a@b.c' }));
    expect(result.status).toBe('failed');
    expect(result.error).toContain('fill_document or pdf_generate node before');
  });

  it('falls back to the org owner when no recipient is configured', async () => {
    entitlementsRepository.findOwnerEmail.mockResolvedValue({ email: 'owner@acme.test' });
    storage.download.mockResolvedValue(await fixturePdf());

    const result = await adapter.execute(
      ctx('send_document', {}, { filledDocumentKey: 'some/key.pdf' }),
    );

    expect(result.status).toBe('completed');
    expect(email.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'owner@acme.test' }));
  });

  it('skips at the EMAILS cap without downloading', async () => {
    entitlements.getMeterState.mockResolvedValue({ used: 25, limit: 25 });
    const result = await adapter.execute(
      ctx('send_document', { to: 'a@b.c' }, { filledDocumentKey: 'some/key.pdf' }),
    );
    expect(result.status).toBe('skipped');
    expect(storage.download).not.toHaveBeenCalled();
  });
});

const formsRepository = {
  findById: jest.fn().mockResolvedValue(null),
};

describe('PdfGenerateStepAdapter', () => {
  const adapter = new PdfGenerateStepAdapter(
    // Reason: structural mocks stand in for Nest providers in unit tests.
    storage as any,
    entitlements as any,
    workflowsRepository as any,
    formsRepository as any,
    logger as any,
  );

  it('renders a summary PDF, uploads it, meters DOC_FILLS, and mirrors the key', async () => {
    const result = await adapter.execute(ctx('pdf_generate', { title: '{{_formName}} recap' }));

    expect(result.status).toBe('completed');
    expect(result.outputData?.pdfTitle).toBe('Intake recap');
    expect(result.outputData?.pdfKey).toBe('workflow-artifacts/org-1/run-1/n-1.pdf');
    // No fill in state → the generated PDF becomes the default send target
    expect(result.outputData?.filledDocumentKey).toBe('workflow-artifacts/org-1/run-1/n-1.pdf');

    const uploaded: Buffer = storage.upload.mock.calls[0][1];
    const parsed = await PDFDocument.load(uploaded);
    expect(parsed.getPageCount()).toBeGreaterThanOrEqual(1);
    expect(entitlements.consume).toHaveBeenCalledWith(
      'org-1',
      'DOC_FILLS',
      expect.objectContaining({ idempotencyKey: 'docfill:run:run-1:n-1' }),
    );
  });

  it('does not steal filledDocumentKey from an earlier fill', async () => {
    const result = await adapter.execute(
      ctx('pdf_generate', {}, { filledDocumentKey: 'existing/fill.pdf' }),
    );
    expect(result.outputData?.filledDocumentKey).toBeUndefined();
  });

  it('skips at the DOC_FILLS cap', async () => {
    entitlements.getMeterState.mockResolvedValue({ used: 10, limit: 10 });
    const result = await adapter.execute(ctx('pdf_generate', {}));
    expect(result.status).toBe('skipped');
    expect(storage.upload).not.toHaveBeenCalled();
  });
});

describe('buildPdfRows (schema-driven PDF layout)', () => {
  const field = (id: string, type: string, label: string, sortOrder: number, page = 1) => ({
    id,
    type,
    label,
    required: false,
    config: {},
    sortOrder,
    page,
  });

  it('prints human labels in form order with section headers', () => {
    const rows = buildPdfRows({ email: 'a@b.c', name: 'Jane' }, {
      fields: [
        field('sec-1', 'section', 'Contact', 0),
        field('name', 'text', 'Full Name', 1),
        field('email', 'email', 'Email Address', 2),
      ],
    } as never);
    expect(rows).toEqual([
      { kind: 'section', label: 'Contact' },
      { kind: 'answer', label: 'Full Name', value: 'Jane' },
      { kind: 'answer', label: 'Email Address', value: 'a@b.c' },
    ]);
  });

  it('skips empty answers and sections with no answered fields', () => {
    const rows = buildPdfRows({ name: 'Jane' }, {
      fields: [
        field('name', 'text', 'Full Name', 0),
        field('sec-2', 'section', 'Empty Section', 1),
        field('notes', 'multiline', 'Notes', 2),
      ],
    } as never);
    expect(rows).toEqual([{ kind: 'answer', label: 'Full Name', value: 'Jane' }]);
  });

  it('appends answers whose ids are missing from the schema', () => {
    const rows = buildPdfRows({ name: 'Jane', 'legacy-field': 'kept' }, {
      fields: [field('name', 'text', 'Full Name', 0)],
    } as never);
    expect(rows[1]).toEqual({ kind: 'answer', label: 'legacy-field', value: 'kept' });
  });

  it('summarizes signature data URLs instead of dumping base64', () => {
    const rows = buildPdfRows({ sig: `data:image/png;base64,${'A'.repeat(500)}` }, {
      fields: [field('sig', 'signature', 'Signature', 0)],
    } as never);
    expect(rows).toEqual([{ kind: 'answer', label: 'Signature', value: '[Signed]' }]);
  });

  it('falls back to raw ids when there is no schema at all', () => {
    const rows = buildPdfRows({ name: 'Jane' }, null);
    expect(rows).toEqual([{ kind: 'answer', label: 'name', value: 'Jane' }]);
  });
});

describe('NotifyStepAdapter', () => {
  const adapter = new NotifyStepAdapter(
    // Reason: structural mocks stand in for Nest providers in unit tests.
    email as any,
    entitlements as any,
    entitlementsRepository as any,
  );

  it('falls back to the org owner when no recipient is configured', async () => {
    const result = await adapter.execute(
      ctx('notify', { title: 'New {{_formName}} submission', body: 'From {{formData.name}}' }),
    );

    expect(result.status).toBe('completed');
    expect(email.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'owner@acme.test', subject: 'New Intake submission' }),
    );
    // Self-notifications are deliberately not metered against EMAILS
    expect(entitlements.consume).not.toHaveBeenCalled();
  });

  it('uses the configured recipient when present', async () => {
    await adapter.execute(ctx('notify', { to: 'ops@acme.test' }));
    expect(email.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'ops@acme.test' }));
    expect(entitlementsRepository.findOwnerEmail).not.toHaveBeenCalled();
  });

  it('fails when there is no recipient and no owner', async () => {
    entitlementsRepository.findOwnerEmail.mockResolvedValue(null);
    const result = await adapter.execute(ctx('notify', {}));
    expect(result.status).toBe('failed');
  });
});
