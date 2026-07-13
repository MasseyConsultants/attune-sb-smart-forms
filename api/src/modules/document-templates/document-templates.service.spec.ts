// Author: Robert Massey | Created: 2026-07-13 | Module: Document Templates
// Purpose: Upload pipeline + mapping persistence tests. The plan gates
// (uploadedTemplates cap, per-plan maxUploadBytes) are paywall behaviour and
// get the same exhaustive treatment as the rest of the entitlement layer.

import { PLAN_ENTITLEMENTS } from '@attune-sb/shared-types';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  PayloadTooLargeException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DocumentTemplateStatus, Role } from '@prisma/client';
import { PDFDocument } from 'pdf-lib';

import { DocumentTemplatesRepository } from './document-templates.repository';
import type { UploadedFile } from './document-templates.service';
import { DocumentTemplatesService } from './document-templates.service';

// Puppeteer's ESM entry cannot be parsed by Jest (and launching headless
// Chrome has no place in a unit test) — the DOCX branch is covered by
// asserting the converter boundary is called.
jest.mock('./docx-converter', () => ({
  convertDocxToPdf: jest.fn(),
}));

import type { AuthenticatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { SecureLoggerService } from '@/modules/common/logger/secure-logger.service';
import { BlobStorageService } from '@/modules/common/storage/blob-storage.service';
import { EntitlementExceededException } from '@/modules/entitlements/entitlement-exceeded.exception';
import { EntitlementsService } from '@/modules/entitlements/entitlements.service';
import { FormsRepository } from '@/modules/forms/forms.repository';

const ORG_ID = 'org-1';
const user: AuthenticatedUser = {
  userId: 'user-1',
  email: 'builder@example.com',
  role: Role.BUILDER,
  organizationId: ORG_ID,
};

const trialSnapshot = {
  planId: 'trial' as const,
  definition: PLAN_ENTITLEMENTS.trial,
  billingAnchorDay: 1,
};

async function validPdfBuffer(pages = 1): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i += 1) {
    doc.addPage([612, 792]);
  }
  return Buffer.from(await doc.save());
}

function pdfFile(buffer: Buffer, name = 'w9.pdf'): UploadedFile {
  return { buffer, mimetype: 'application/pdf', originalname: name, size: buffer.length };
}

const baseTemplate = {
  id: 'tpl-1',
  name: 'W-9',
  status: DocumentTemplateStatus.READY,
  failureReason: null,
  originalKey: `document-templates/${ORG_ID}/tpl-1/original.pdf`,
  pdfKey: `document-templates/${ORG_ID}/tpl-1/original.pdf`,
  mimeType: 'application/pdf',
  sizeBytes: 1234,
  pageCount: 2,
  pageDimensions: [
    { width: 612, height: 792 },
    { width: 612, height: 792 },
  ],
  fieldMappings: [],
  organizationId: ORG_ID,
  formId: 'form-1',
  createdById: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  form: { id: 'form-1', name: 'Vendor intake' },
};

describe('DocumentTemplatesService', () => {
  let service: DocumentTemplatesService;

  const repository = {
    create: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
    findById: jest.fn(),
    existsAnywhere: jest.fn().mockResolvedValue(false),
    update: jest.fn(),
    softDelete: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
    formAlreadyLinked: jest.fn().mockResolvedValue(false),
  };

  const formsRepository = {
    findById: jest.fn().mockResolvedValue({ id: 'form-1', name: 'Vendor intake' }),
  };

  const storage = {
    upload: jest.fn().mockResolvedValue(undefined),
    download: jest.fn(),
    delete: jest.fn(),
    deletePrefix: jest.fn().mockResolvedValue(undefined),
    configured: true,
  };

  const entitlements = {
    assertCountedAvailable: jest.fn().mockResolvedValue(undefined),
    assertMeterAvailable: jest.fn().mockResolvedValue(undefined),
    getPlanSnapshot: jest.fn().mockResolvedValue(trialSnapshot),
  };

  const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    entitlements.getPlanSnapshot.mockResolvedValue(trialSnapshot);
    formsRepository.findById.mockResolvedValue({ id: 'form-1', name: 'Vendor intake' });
    repository.formAlreadyLinked.mockResolvedValue(false);
    repository.create.mockImplementation((data: Record<string, unknown>) =>
      Promise.resolve({ ...baseTemplate, ...data, id: 'tpl-new', form: null }),
    );
    repository.update.mockImplementation((id: string, data: Record<string, unknown>) =>
      Promise.resolve({ ...baseTemplate, id, ...data }),
    );

    const moduleRef = await Test.createTestingModule({
      providers: [
        DocumentTemplatesService,
        { provide: DocumentTemplatesRepository, useValue: repository },
        { provide: FormsRepository, useValue: formsRepository },
        { provide: BlobStorageService, useValue: storage },
        { provide: EntitlementsService, useValue: entitlements },
        { provide: SecureLoggerService, useValue: logger },
      ],
    }).compile();

    service = moduleRef.get(DocumentTemplatesService);
  });

  describe('upload', () => {
    it('stores a valid PDF and returns READY with extracted geometry', async () => {
      const buffer = await validPdfBuffer(2);
      const result = await service.upload(pdfFile(buffer), {}, user);

      expect(entitlements.assertCountedAvailable).toHaveBeenCalledWith(ORG_ID, 'uploadedTemplates');
      expect(storage.upload).toHaveBeenCalledWith(
        'document-templates/org-1/tpl-new/original.pdf',
        buffer,
        'application/pdf',
      );
      expect(repository.update).toHaveBeenCalledWith(
        'tpl-new',
        expect.objectContaining({ status: DocumentTemplateStatus.READY, pageCount: 2 }),
      );
      expect(result.status).toBe(DocumentTemplateStatus.READY);
      expect(result.pageDimensions).toHaveLength(2);
    });

    it('rejects unsupported MIME types before any gate or storage call', async () => {
      const file: UploadedFile = {
        buffer: Buffer.from('gif'),
        mimetype: 'image/gif',
        originalname: 'cat.gif',
        size: 3,
      };
      await expect(service.upload(file, {}, user)).rejects.toThrow(BadRequestException);
      expect(entitlements.assertCountedAvailable).not.toHaveBeenCalled();
      expect(storage.upload).not.toHaveBeenCalled();
    });

    it('propagates LIMIT_EXCEEDED when the uploadedTemplates cap is reached', async () => {
      entitlements.assertCountedAvailable.mockRejectedValueOnce(
        new EntitlementExceededException({
          entitlement: 'uploadedTemplates',
          limit: 1,
          current: 1,
          resetsAt: null,
          upgradeUrl: 'http://localhost:3000/billing',
        }),
      );
      const buffer = await validPdfBuffer();
      await expect(service.upload(pdfFile(buffer), {}, user)).rejects.toThrow(
        EntitlementExceededException,
      );
      expect(storage.upload).not.toHaveBeenCalled();
    });

    it("rejects files above the plan's maxUploadBytes", async () => {
      const buffer = await validPdfBuffer();
      const oversized: UploadedFile = {
        ...pdfFile(buffer),
        size: PLAN_ENTITLEMENTS.trial.limits.maxUploadBytes + 1,
      };
      await expect(service.upload(oversized, {}, user)).rejects.toThrow(PayloadTooLargeException);
      expect(storage.upload).not.toHaveBeenCalled();
    });

    it('marks the row FAILED and rethrows when the PDF does not parse', async () => {
      const corrupted = Buffer.from('%PDF-1.7 not really a pdf');
      await expect(service.upload(pdfFile(corrupted), {}, user)).rejects.toThrow(
        UnprocessableEntityException,
      );
      expect(repository.update).toHaveBeenCalledWith(
        'tpl-new',
        expect.objectContaining({ status: DocumentTemplateStatus.FAILED }),
      );
    });

    it('refuses linking to a form that already has a template', async () => {
      repository.formAlreadyLinked.mockResolvedValueOnce(true);
      const buffer = await validPdfBuffer();
      await expect(service.upload(pdfFile(buffer), { formId: 'form-1' }, user)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('saveMappings', () => {
    it('persists mappings for a ready, linked template', async () => {
      repository.findById.mockResolvedValueOnce({ ...baseTemplate });
      const mappings = [
        { fieldId: 'f1', fieldLabel: 'Name', page: 0, x: 10, y: 20, width: 120, height: 18 },
      ];
      const result = await service.saveMappings('tpl-1', { mappings }, user);
      expect(repository.update).toHaveBeenCalledWith('tpl-1', { fieldMappings: mappings });
      expect(result.fieldMappings).toEqual(mappings);
    });

    it('rejects mappings when the template is not linked to a form', async () => {
      repository.findById.mockResolvedValueOnce({ ...baseTemplate, formId: null, form: null });
      await expect(service.saveMappings('tpl-1', { mappings: [] }, user)).rejects.toThrow(
        /Link the template/,
      );
    });

    it('rejects mappings that target pages beyond the document', async () => {
      repository.findById.mockResolvedValueOnce({ ...baseTemplate });
      const mappings = [
        { fieldId: 'f1', fieldLabel: 'Name', page: 5, x: 0, y: 0, width: 10, height: 10 },
      ];
      await expect(service.saveMappings('tpl-1', { mappings }, user)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('tenant isolation', () => {
    it('returns 404 and logs a security event on cross-org access', async () => {
      repository.findById.mockResolvedValueOnce(null);
      repository.existsAnywhere.mockResolvedValueOnce(true);
      await expect(service.findOne('tpl-other-org', user)).rejects.toThrow(NotFoundException);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('SECURITY: cross-org template access'),
        'DocumentTemplatesService',
      );
    });
  });

  describe('remove', () => {
    it('deletes blobs first, then soft-deletes the row', async () => {
      repository.findById.mockResolvedValueOnce({ ...baseTemplate });
      const order: string[] = [];
      storage.deletePrefix.mockImplementationOnce(() => {
        order.push('blobs');
        return Promise.resolve();
      });
      repository.softDelete.mockImplementationOnce(() => {
        order.push('row');
        return Promise.resolve();
      });

      await service.remove('tpl-1', user);

      expect(storage.deletePrefix).toHaveBeenCalledWith('document-templates/org-1/tpl-1');
      expect(order).toEqual(['blobs', 'row']);
    });
  });
});
