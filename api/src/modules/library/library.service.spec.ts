// Author: Robert Massey | Created: 2026-07-13 | Module: Library / Tests
// Clone materialization (form + bundled workflow as DRAFTs), install counting,
// the publishOrgTemplates feature gate, tenant scoping, and slug retries.

import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { LibraryTemplateScope, Prisma } from '@prisma/client';

import { LibraryService } from './library.service';

import { EntitlementExceededException } from '@/modules/entitlements/entitlement-exceeded.exception';

const repository = {
  findManyPublic: jest.fn(),
  findManyForOrg: jest.fn(),
  findPublicBySlug: jest.fn(),
  findCloneable: jest.fn(),
  findOrgTemplate: jest.fn(),
  create: jest.fn(),
  softDelete: jest.fn(),
  incrementInstallCount: jest.fn(),
};

const formsService = { create: jest.fn() };
const formsRepository = { findById: jest.fn() };
const workflowsRepository = { create: jest.fn(), findById: jest.fn() };
const documentTemplates = { create: jest.fn(), update: jest.fn() };
const storage = { upload: jest.fn() };
const entitlements = { requireFeature: jest.fn(), assertCountedAvailable: jest.fn() };
const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

const USER = {
  userId: 'user-1',
  email: 'builder@acme.test',
  role: 'BUILDER',
  organizationId: 'org-1',
};

const SCHEMA = {
  fields: [
    { id: 'f1', type: 'text', label: 'Name', required: true, config: {}, sortOrder: 0, page: 1 },
  ],
};

const GRAPH = {
  name: 'On submit',
  nodes: [
    { id: 'n1', type: 'start', label: 'Start', config: {}, position: { x: 0, y: 0 } },
    { id: 'n2', type: 'end', label: 'End', config: {}, position: { x: 0, y: 100 } },
  ],
  edges: [{ id: 'e1', source: 'n1', target: 'n2' }],
};

function makeTemplate(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tpl-1',
    slug: 'client-intake-ab12',
    name: 'Client Intake',
    description: 'A starter intake form',
    category: 'intake',
    tags: ['general'],
    scope: LibraryTemplateScope.PUBLIC,
    schema: SCHEMA,
    workflow: null,
    document: null,
    installCount: 3,
    organizationId: null,
    createdById: null,
    createdAt: new Date('2026-07-13T00:00:00Z'),
    updatedAt: new Date('2026-07-13T00:00:00Z'),
    deletedAt: null,
    ...overrides,
  };
}

function makeService(): LibraryService {
  // Reason: structural mocks stand in for Nest providers in unit tests.
  return new LibraryService(
    repository as any,
    formsService as any,
    formsRepository as any,
    workflowsRepository as any,
    documentTemplates as any,
    storage as any,
    entitlements as any,
    logger as any,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  entitlements.requireFeature.mockResolvedValue(undefined);
  entitlements.assertCountedAvailable.mockResolvedValue(undefined);
  formsService.create.mockResolvedValue({ id: 'form-9', name: 'Client Intake' });
  workflowsRepository.create.mockResolvedValue({ id: 'wf-9' });
  documentTemplates.create.mockResolvedValue({ id: 'doc-9' });
  documentTemplates.update.mockResolvedValue({ id: 'doc-9' });
  storage.upload.mockResolvedValue(undefined);
  repository.incrementInstallCount.mockResolvedValue(undefined);
  repository.create.mockImplementation((data: { slug: string }) =>
    Promise.resolve(makeTemplate({ id: 'tpl-new', ...data })),
  );
});

describe('clone', () => {
  it('creates a draft form from the template schema and bumps installCount', async () => {
    repository.findCloneable.mockResolvedValue(makeTemplate());
    const service = makeService();

    const result = await service.clone('tpl-1', USER as any);

    expect(formsService.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Client Intake', schema: SCHEMA }),
      USER,
    );
    expect(workflowsRepository.create).not.toHaveBeenCalled();
    expect(documentTemplates.create).not.toHaveBeenCalled();
    expect(repository.incrementInstallCount).toHaveBeenCalledWith('tpl-1');
    expect(result).toEqual({
      formId: 'form-9',
      formName: 'Client Intake',
      workflowId: null,
      documentTemplateId: null,
    });
  });

  it('also creates a draft workflow bound to the new form when the template bundles one', async () => {
    repository.findCloneable.mockResolvedValue(makeTemplate({ workflow: GRAPH }));
    const service = makeService();

    const result = await service.clone('tpl-1', USER as any);

    expect(workflowsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'On submit',
        triggerFormId: 'form-9',
        organizationId: 'org-1',
        createdById: 'user-1',
      }),
    );
    expect(result.workflowId).toBe('wf-9');
  });

  it('404s when the template does not exist or belongs to another org', async () => {
    repository.findCloneable.mockResolvedValue(null);
    const service = makeService();

    await expect(service.clone('tpl-x', USER as any)).rejects.toThrow(NotFoundException);
    expect(formsService.create).not.toHaveBeenCalled();
    expect(repository.findCloneable).toHaveBeenCalledWith('tpl-x', 'org-1');
  });

  it('materializes a bundled document blueprint as a READY document template', async () => {
    repository.findCloneable.mockResolvedValue(
      makeTemplate({ document: { blueprint: 'contractor-quote' } }),
    );
    const service = makeService();

    const result = await service.clone('tpl-1', USER as any);

    expect(entitlements.assertCountedAvailable).toHaveBeenCalledWith('org-1', 'uploadedTemplates');
    expect(documentTemplates.create).toHaveBeenCalledWith(
      expect.objectContaining({
        formId: 'form-9',
        organizationId: 'org-1',
        mimeType: 'application/pdf',
      }),
    );
    expect(storage.upload).toHaveBeenCalledWith(
      'document-templates/org-1/doc-9/original.pdf',
      expect.any(Buffer),
      'application/pdf',
    );
    expect(documentTemplates.update).toHaveBeenCalledWith(
      'doc-9',
      expect.objectContaining({
        status: 'READY',
        fieldMappings: expect.arrayContaining([
          expect.objectContaining({ fieldId: 'customer-email' }),
        ]),
      }),
    );
    expect(result.documentTemplateId).toBe('doc-9');
  });

  it('skips the document (clone still succeeds) at the uploadedTemplates cap', async () => {
    repository.findCloneable.mockResolvedValue(
      makeTemplate({ document: { blueprint: 'trade-quote' } }),
    );
    entitlements.assertCountedAvailable.mockRejectedValue(
      new EntitlementExceededException({
        entitlement: 'uploadedTemplates',
        limit: 1,
        current: 1,
        resetsAt: null,
        upgradeUrl: '/billing',
      }),
    );
    const service = makeService();

    const result = await service.clone('tpl-1', USER as any);

    expect(documentTemplates.create).not.toHaveBeenCalled();
    expect(result.documentTemplateId).toBeNull();
    expect(result.formId).toBe('form-9');
  });
});

describe('publishOrgTemplate', () => {
  const DTO = {
    formId: 'form-1',
    name: 'My Template',
    description: 'desc',
    category: 'intake' as const,
  };

  it('is gated by the publishOrgTemplates feature', async () => {
    entitlements.requireFeature.mockRejectedValue(new Error('LIMIT_EXCEEDED'));
    const service = makeService();

    await expect(service.publishOrgTemplate(DTO as any, USER as any)).rejects.toThrow(
      'LIMIT_EXCEEDED',
    );
    expect(entitlements.requireFeature).toHaveBeenCalledWith('org-1', 'publishOrgTemplates');
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('creates an ORG-scope template from an owned form', async () => {
    formsRepository.findById.mockResolvedValue({ id: 'form-1', schema: SCHEMA });
    const service = makeService();

    const result = await service.publishOrgTemplate(DTO as any, USER as any);

    expect(formsRepository.findById).toHaveBeenCalledWith('form-1', 'org-1');
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: LibraryTemplateScope.ORG,
        organization: { connect: { id: 'org-1' } },
        slug: expect.stringMatching(/^my-template-[a-z2-9]{4}$/),
      }),
    );
    expect(result.scope).toBe(LibraryTemplateScope.ORG);
  });

  it('bundles a workflow graph when workflowId is provided', async () => {
    formsRepository.findById.mockResolvedValue({ id: 'form-1', schema: SCHEMA });
    workflowsRepository.findById.mockResolvedValue({
      id: 'wf-1',
      name: 'Approvals',
      nodes: GRAPH.nodes,
      edges: GRAPH.edges,
    });
    const service = makeService();

    await service.publishOrgTemplate({ ...DTO, workflowId: 'wf-1' } as any, USER as any);

    expect(workflowsRepository.findById).toHaveBeenCalledWith('wf-1', 'org-1');
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        workflow: expect.objectContaining({ name: 'Approvals' }),
      }),
    );
  });

  it('rejects a form with no fields', async () => {
    formsRepository.findById.mockResolvedValue({ id: 'form-1', schema: { fields: [] } });
    const service = makeService();

    await expect(service.publishOrgTemplate(DTO as any, USER as any)).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('404s when the form is not in the caller org', async () => {
    formsRepository.findById.mockResolvedValue(null);
    const service = makeService();

    await expect(service.publishOrgTemplate(DTO as any, USER as any)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('retries slug collisions, then gives up with a conflict', async () => {
    formsRepository.findById.mockResolvedValue({ id: 'form-1', schema: SCHEMA });
    const collision = new Prisma.PrismaClientKnownRequestError('unique', {
      code: 'P2002',
      clientVersion: 'test',
    });
    repository.create.mockRejectedValue(collision);
    const service = makeService();

    await expect(service.publishOrgTemplate(DTO as any, USER as any)).rejects.toThrow(
      ConflictException,
    );
    expect(repository.create).toHaveBeenCalledTimes(5);
  });
});

describe('org template access', () => {
  it('getOrgTemplate scopes to the caller org', async () => {
    repository.findOrgTemplate.mockResolvedValue(null);
    const service = makeService();

    await expect(service.getOrgTemplate('tpl-1', USER as any)).rejects.toThrow(NotFoundException);
    expect(repository.findOrgTemplate).toHaveBeenCalledWith('tpl-1', 'org-1');
  });

  it('removeOrgTemplate soft-deletes only owned templates', async () => {
    repository.findOrgTemplate.mockResolvedValue(
      makeTemplate({ scope: LibraryTemplateScope.ORG, organizationId: 'org-1' }),
    );
    repository.softDelete.mockResolvedValue(undefined);
    const service = makeService();

    await service.removeOrgTemplate('tpl-1', USER as any);

    expect(repository.softDelete).toHaveBeenCalledWith('tpl-1');
  });
});
