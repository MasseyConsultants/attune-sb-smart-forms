// Author: Robert Massey | Created: 2026-07-13 | Module: Forms / Tests
// FSM transitions, publish gating at the activeForms cap, tenant isolation
// (cross-org access = 404 + security log), and schema validation rules.

import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { FormStatus } from '@prisma/client';

import { FormsService } from './forms.service';

import { EntitlementExceededException } from '@/modules/entitlements/entitlement-exceeded.exception';

const repository = {
  findMany: jest.fn(),
  findById: jest.fn(),
  existsAnywhere: jest.fn(),
  findBySlug: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  createVersion: jest.fn(),
  findVersions: jest.fn(),
  countPublished: jest.fn(),
};

const entitlements = {
  assertCountedAvailable: jest.fn(),
};

const cache = { get: jest.fn(), set: jest.fn(), del: jest.fn(), delByPattern: jest.fn() };
const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

const USER = {
  userId: 'user-1',
  email: 'builder@acme.test',
  role: 'BUILDER',
  organizationId: 'org-1',
};

const OTHER_ORG_USER = { ...USER, userId: 'user-9', organizationId: 'org-2' };

const VALID_SCHEMA = {
  fields: [
    { id: 'f1', type: 'text', label: 'Name', required: true, config: {}, sortOrder: 0, page: 1 },
    { id: 'f2', type: 'email', label: 'Email', required: false, config: {}, sortOrder: 1, page: 1 },
  ],
};

function makeForm(overrides: Record<string, unknown> = {}) {
  return {
    id: 'form-1',
    name: 'Intake',
    description: null,
    slug: 'abc123xyz9',
    schema: VALID_SCHEMA,
    status: FormStatus.DRAFT,
    version: 1,
    organizationId: 'org-1',
    createdById: 'user-1',
    createdAt: new Date('2026-07-13T00:00:00Z'),
    updatedAt: new Date('2026-07-13T00:00:00Z'),
    deletedAt: null,
    ...overrides,
  };
}

function makeService(): FormsService {
  // Reason: structural mocks stand in for Nest providers in unit tests.
  return new FormsService(repository as any, entitlements as any, cache as any, logger as any);
}

beforeEach(() => {
  jest.clearAllMocks();
  cache.get.mockResolvedValue(null);
  cache.set.mockResolvedValue(undefined);
  cache.delByPattern.mockResolvedValue(undefined);
  entitlements.assertCountedAvailable.mockResolvedValue(undefined);
  repository.update.mockImplementation((_id, _org, data) =>
    Promise.resolve(makeForm(data as Record<string, unknown>)),
  );
  repository.createVersion.mockResolvedValue({});
});

describe('FormsService — create', () => {
  it('creates a DRAFT with a generated slug and invalidates the list cache', async () => {
    repository.create.mockImplementation((data) => Promise.resolve(makeForm(data)));

    const service = makeService();
    const form = await service.create({ name: 'Intake' }, USER as any);

    expect(form.status).toBe(FormStatus.DRAFT);
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ slug: expect.stringMatching(/^[a-z2-9]{10}$/) }),
    );
    expect(cache.delByPattern).toHaveBeenCalledWith('forms:list:org-1:*');
  });

  it('retries slug allocation on unique collision', async () => {
    const collision = Object.assign(new Error('unique'), { code: 'P2002' });
    Object.setPrototypeOf(
      collision,
      // Reason: simulating Prisma's known-request error class without a DB.
      (jest.requireActual('@prisma/client') as any).Prisma.PrismaClientKnownRequestError.prototype,
    );
    repository.create
      .mockRejectedValueOnce(collision)
      .mockImplementation((data) => Promise.resolve(makeForm(data)));

    const service = makeService();
    await service.create({ name: 'Intake' }, USER as any);

    expect(repository.create).toHaveBeenCalledTimes(2);
  });
});

describe('FormsService — FSM transitions', () => {
  it('publishes a DRAFT: snapshot + status flip, in that order', async () => {
    repository.findById.mockResolvedValue(makeForm());

    const service = makeService();
    const form = await service.publish('form-1', {}, USER as any);

    expect(entitlements.assertCountedAvailable).toHaveBeenCalledWith('org-1', 'activeForms');
    expect(repository.createVersion).toHaveBeenCalledWith(
      expect.objectContaining({ formId: 'form-1', version: 1, publishedBy: 'user-1' }),
    );
    expect(repository.update).toHaveBeenCalledWith('form-1', 'org-1', {
      status: FormStatus.PUBLISHED,
    });
    expect(form.status).toBe(FormStatus.PUBLISHED);
  });

  it('rejects publishing a PUBLISHED form', async () => {
    repository.findById.mockResolvedValue(makeForm({ status: FormStatus.PUBLISHED }));
    await expect(makeService().publish('form-1', {}, USER as any)).rejects.toThrow(
      ConflictException,
    );
  });

  it('rejects publishing an ARCHIVED form', async () => {
    repository.findById.mockResolvedValue(makeForm({ status: FormStatus.ARCHIVED }));
    await expect(makeService().publish('form-1', {}, USER as any)).rejects.toThrow(
      ConflictException,
    );
  });

  it('unpublishes a PUBLISHED form back to DRAFT and bumps the version', async () => {
    repository.findById.mockResolvedValue(makeForm({ status: FormStatus.PUBLISHED, version: 3 }));

    await makeService().unpublish('form-1', USER as any);

    expect(repository.update).toHaveBeenCalledWith('form-1', 'org-1', {
      status: FormStatus.DRAFT,
      version: 4,
    });
  });

  it('rejects unpublishing a DRAFT', async () => {
    repository.findById.mockResolvedValue(makeForm());
    await expect(makeService().unpublish('form-1', USER as any)).rejects.toThrow(ConflictException);
  });

  it('republish bumps the version, snapshots, and skips the activeForms gate', async () => {
    repository.findById.mockResolvedValue(makeForm({ status: FormStatus.PUBLISHED, version: 2 }));

    await makeService().republish('form-1', {}, USER as any);

    expect(entitlements.assertCountedAvailable).not.toHaveBeenCalled();
    expect(repository.createVersion).toHaveBeenCalledWith(expect.objectContaining({ version: 3 }));
  });

  it('rejects republish on a DRAFT', async () => {
    repository.findById.mockResolvedValue(makeForm());
    await expect(makeService().republish('form-1', {}, USER as any)).rejects.toThrow(
      ConflictException,
    );
  });

  it('archives only PUBLISHED forms', async () => {
    repository.findById.mockResolvedValue(makeForm({ status: FormStatus.PUBLISHED }));
    await makeService().archive('form-1', USER as any);
    expect(repository.update).toHaveBeenCalledWith('form-1', 'org-1', {
      status: FormStatus.ARCHIVED,
    });

    repository.findById.mockResolvedValue(makeForm());
    await expect(makeService().archive('form-1', USER as any)).rejects.toThrow(ConflictException);
  });

  it('blocks schema edits on a PUBLISHED form', async () => {
    repository.findById.mockResolvedValue(makeForm({ status: FormStatus.PUBLISHED }));
    await expect(makeService().update('form-1', { name: 'New name' }, USER as any)).rejects.toThrow(
      ConflictException,
    );
  });
});

describe('FormsService — publish gating (the paywall boundary)', () => {
  it('propagates LIMIT_EXCEEDED from the entitlement layer without snapshotting', async () => {
    repository.findById.mockResolvedValue(makeForm());
    entitlements.assertCountedAvailable.mockRejectedValue(
      new EntitlementExceededException({
        entitlement: 'activeForms',
        limit: 2,
        current: 2,
        resetsAt: null,
        upgradeUrl: 'http://localhost:3100/billing',
      }),
    );

    await expect(makeService().publish('form-1', {}, USER as any)).rejects.toThrow(
      EntitlementExceededException,
    );
    expect(repository.createVersion).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('unpublish works even when the org is at its cap', async () => {
    repository.findById.mockResolvedValue(makeForm({ status: FormStatus.PUBLISHED }));
    entitlements.assertCountedAvailable.mockRejectedValue(new Error('should not be called'));

    await expect(makeService().unpublish('form-1', USER as any)).resolves.toBeDefined();
    expect(entitlements.assertCountedAvailable).not.toHaveBeenCalled();
  });
});

describe('FormsService — tenant isolation', () => {
  it('answers 404 for a form in another org and logs a security event', async () => {
    repository.findById.mockResolvedValue(null);
    repository.existsAnywhere.mockResolvedValue(true);

    await expect(makeService().findOne('form-1', OTHER_ORG_USER as any)).rejects.toThrow(
      NotFoundException,
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('SECURITY: cross-org form access attempt'),
      'FormsService',
    );
  });

  it('answers 404 for a nonexistent form without a security log', async () => {
    repository.findById.mockResolvedValue(null);
    repository.existsAnywhere.mockResolvedValue(false);

    await expect(makeService().findOne('missing', USER as any)).rejects.toThrow(NotFoundException);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('scopes list queries to the caller org', async () => {
    repository.findMany.mockResolvedValue({ forms: [], total: 0 });

    await makeService().findAll('org-1', { page: 1, pageSize: 20 } as any);

    expect(repository.findMany).toHaveBeenCalledWith('org-1', expect.anything());
  });
});

describe('FormsService — schema validation', () => {
  const service = makeService();

  it('accepts a structurally valid schema', () => {
    expect(() => service.validateSchema(VALID_SCHEMA as any)).not.toThrow();
  });

  it('rejects an empty form', () => {
    expect(() => service.validateSchema({ fields: [] } as any)).toThrow(
      UnprocessableEntityException,
    );
  });

  it('rejects duplicate field ids', () => {
    const schema = {
      fields: [VALID_SCHEMA.fields[0], { ...VALID_SCHEMA.fields[1], id: 'f1' }],
    };
    expect(() => service.validateSchema(schema as any)).toThrow(UnprocessableEntityException);
  });

  it('rejects unknown field types', () => {
    const schema = { fields: [{ ...VALID_SCHEMA.fields[0], type: 'hologram' }] };
    expect(() => service.validateSchema(schema as any)).toThrow(UnprocessableEntityException);
  });

  it('rejects blank labels and invalid pages', () => {
    const blankLabel = { fields: [{ ...VALID_SCHEMA.fields[0], label: '  ' }] };
    expect(() => service.validateSchema(blankLabel as any)).toThrow(UnprocessableEntityException);

    const badPage = { fields: [{ ...VALID_SCHEMA.fields[0], page: 0 }] };
    expect(() => service.validateSchema(badPage as any)).toThrow(UnprocessableEntityException);
  });

  it('rejects conditional rules referencing unknown fields', () => {
    const schema = {
      fields: [
        {
          ...VALID_SCHEMA.fields[0],
          conditionalVisibility: {
            enabled: true,
            rules: [{ fieldId: 'ghost', operator: 'equals', value: 'x' }],
          },
        },
      ],
    };
    expect(() => service.validateSchema(schema as any)).toThrow(UnprocessableEntityException);
  });

  it('rejects navigation rules referencing unknown fields', () => {
    const schema = {
      ...VALID_SCHEMA,
      navigationRules: [
        { id: 'n1', fieldId: 'ghost', operator: 'equals', value: 'x', targetPage: 2 },
      ],
    };
    expect(() => service.validateSchema(schema as any)).toThrow(UnprocessableEntityException);
  });

  it('publish validates the stored schema before touching the entitlement layer', async () => {
    repository.findById.mockResolvedValue(makeForm({ schema: { fields: [] } }));

    await expect(makeService().publish('form-1', {}, USER as any)).rejects.toThrow(
      UnprocessableEntityException,
    );
    expect(entitlements.assertCountedAvailable).not.toHaveBeenCalled();
  });
});
