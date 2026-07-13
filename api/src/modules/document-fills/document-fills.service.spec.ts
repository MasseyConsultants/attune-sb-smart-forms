// Author: Robert Massey | Created: 2026-07-13 | Module: Document Fills / Tests
// The fill runtime sits on the public intake path — the cardinal rule is that
// nothing here may ever break a submission. Covered: happy path, DOC_FILLS
// at-cap skip, no-template/no-mapping no-ops, swallowed failures, and
// org-scoped download.

import { NotFoundException } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';

import { DocumentFillsService } from './document-fills.service';

const repository = {
  setFilledDocument: jest.fn(),
  findSubmission: jest.fn(),
};

const templates = {
  findReadyByFormId: jest.fn(),
};

const storage = {
  download: jest.fn(),
  upload: jest.fn(),
};

const entitlements = {
  getMeterState: jest.fn(),
  consume: jest.fn(),
};

const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

const USER = {
  userId: 'user-1',
  email: 'owner@acme.test',
  role: 'OWNER',
  organizationId: 'org-1',
};

const REQUEST = {
  submissionId: 'sub-1',
  formId: 'form-1',
  organizationId: 'org-1',
  data: { name: 'Jane' },
};

function makeService(): DocumentFillsService {
  // Reason: structural mocks stand in for Nest providers in unit tests.
  return new DocumentFillsService(
    repository as any,
    templates as any,
    storage as any,
    entitlements as any,
    logger as any,
  );
}

async function fixturePdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.addPage([612, 792]);
  return Buffer.from(await doc.save());
}

const MAPPINGS = [
  { fieldId: 'name', fieldLabel: 'Name', page: 0, x: 100, y: 100, width: 160, height: 20 },
];

beforeEach(async () => {
  jest.clearAllMocks();
  templates.findReadyByFormId.mockResolvedValue({
    id: 'tpl-1',
    pdfKey: 'document-templates/org-1/tpl-1/original.pdf',
    fieldMappings: MAPPINGS,
  });
  storage.download.mockResolvedValue(await fixturePdf());
  storage.upload.mockResolvedValue(undefined);
  repository.setFilledDocument.mockResolvedValue(undefined);
  entitlements.getMeterState.mockResolvedValue({ used: 0, limit: 10 });
  entitlements.consume.mockResolvedValue({});
});

describe('fillForSubmission', () => {
  it('renders, stores, records, and meters the fill', async () => {
    await makeService().fillForSubmission(REQUEST);

    expect(storage.upload).toHaveBeenCalledWith(
      'document-fills/org-1/sub-1.pdf',
      expect.any(Buffer),
      'application/pdf',
    );
    expect(repository.setFilledDocument).toHaveBeenCalledWith(
      'sub-1',
      'document-fills/org-1/sub-1.pdf',
      expect.any(Number),
    );
    expect(entitlements.consume).toHaveBeenCalledWith(
      'org-1',
      'DOC_FILLS',
      expect.objectContaining({ idempotencyKey: 'docfill:sub-1' }),
    );
  });

  it('skips the fill at the DOC_FILLS cap — submission untouched, nothing consumed', async () => {
    entitlements.getMeterState.mockResolvedValue({ used: 10, limit: 10 });

    await makeService().fillForSubmission(REQUEST);

    expect(storage.upload).not.toHaveBeenCalled();
    expect(repository.setFilledDocument).not.toHaveBeenCalled();
    expect(entitlements.consume).not.toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('skipped_at_cap'),
      'DocumentFillsService',
    );
  });

  it('is a no-op when the form has no READY template', async () => {
    templates.findReadyByFormId.mockResolvedValue(null);
    await makeService().fillForSubmission(REQUEST);
    expect(entitlements.getMeterState).not.toHaveBeenCalled();
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('is a no-op when the template has no mappings', async () => {
    templates.findReadyByFormId.mockResolvedValue({
      id: 'tpl-1',
      pdfKey: 'k',
      fieldMappings: [],
    });
    await makeService().fillForSubmission(REQUEST);
    expect(storage.upload).not.toHaveBeenCalled();
  });

  it('never throws when rendering or storage fails', async () => {
    storage.download.mockRejectedValue(new Error('disk on fire'));
    await expect(makeService().fillForSubmission(REQUEST)).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('disk on fire'),
      undefined,
      'DocumentFillsService',
    );
  });
});

describe('getFilledPdf', () => {
  it('streams the stored PDF for an owned submission', async () => {
    repository.findSubmission.mockResolvedValue({
      id: 'sub-1',
      filledDocumentKey: 'document-fills/org-1/sub-1.pdf',
    });
    storage.download.mockResolvedValue(Buffer.from('%PDF-fake'));

    const result = await makeService().getFilledPdf('sub-1', USER as any);
    expect(result.buffer.toString()).toBe('%PDF-fake');
    expect(repository.findSubmission).toHaveBeenCalledWith('sub-1', 'org-1');
  });

  it('404s when the submission has no fill or belongs to another org', async () => {
    repository.findSubmission.mockResolvedValue(null);
    await expect(makeService().getFilledPdf('sub-1', USER as any)).rejects.toThrow(
      NotFoundException,
    );

    repository.findSubmission.mockResolvedValue({ id: 'sub-1', filledDocumentKey: null });
    await expect(makeService().getFilledPdf('sub-1', USER as any)).rejects.toThrow(
      NotFoundException,
    );
  });
});
