// Author: Robert Massey | Created: 2026-07-13 | Module: Submissions / Tests
// The intake path is a paywall boundary AND a data-loss boundary — both get
// exhaustive coverage: validation against the snapshot, OVER_LIMIT quarantine
// (never rejection), metering resilience, honeypot, lifecycle/status gating,
// quarantine release on headroom, and tenant isolation.

import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { FormStatus, OrgLifecycleState, SubmissionStatus } from '@prisma/client';

import { SubmissionsService } from './submissions.service';

const repository = {
  findPublicTarget: jest.fn(),
  create: jest.fn(),
  findMany: jest.fn(),
  findById: jest.fn(),
  softDelete: jest.fn(),
  countQuarantined: jest.fn(),
  releaseQuarantined: jest.fn(),
  findAllForExport: jest.fn(),
  findLatestVersion: jest.fn(),
  countByForm: jest.fn(),
};

const formsRepository = {
  findById: jest.fn(),
  existsAnywhere: jest.fn(),
};

const entitlements = {
  getMeterState: jest.fn(),
  consume: jest.fn(),
  checkFeature: jest.fn().mockResolvedValue(false),
};

const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

const USER = {
  userId: 'user-1',
  email: 'builder@acme.test',
  role: 'BUILDER',
  organizationId: 'org-1',
};

const SCHEMA = {
  fields: [
    { id: 'name', type: 'text', label: 'Name', required: true, config: {}, sortOrder: 0, page: 1 },
    {
      id: 'email',
      type: 'email',
      label: 'Email',
      required: false,
      config: {},
      sortOrder: 1,
      page: 1,
    },
    {
      id: 'reason',
      type: 'text',
      label: 'Reason',
      required: true,
      config: {},
      sortOrder: 2,
      page: 1,
      conditionalVisibility: {
        enabled: true,
        rules: [{ fieldId: 'email', operator: 'is_not_empty' }],
      },
    },
  ],
};

function makeTarget(overrides: Record<string, unknown> = {}) {
  return {
    form: {
      id: 'form-1',
      name: 'Intake',
      description: null,
      slug: 'liveslug123',
      schema: SCHEMA,
      status: FormStatus.PUBLISHED,
      version: 1,
      organizationId: 'org-1',
      createdById: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      ...(overrides.form as Record<string, unknown> | undefined),
    },
    orgLifecycleState: overrides.orgLifecycleState ?? OrgLifecycleState.ACTIVE,
    latestVersion:
      'latestVersion' in overrides
        ? overrides.latestVersion
        : { id: 'v-1', formId: 'form-1', version: 1, schema: SCHEMA },
  };
}

function makeService(): SubmissionsService {
  // Reason: structural mocks stand in for Nest providers in unit tests.
  return new SubmissionsService(
    repository as any,
    formsRepository as any,
    entitlements as any,
    logger as any,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  entitlements.getMeterState.mockResolvedValue({ used: 0, limit: 50 });
  entitlements.consume.mockResolvedValue({});
  repository.create.mockImplementation((data) =>
    Promise.resolve({
      id: 'sub-1',
      submittedAt: new Date(),
      createdAt: new Date(),
      ...data,
    }),
  );
  repository.countQuarantined.mockResolvedValue(0);
});

describe('SubmissionsService — public intake', () => {
  it('stores a valid submission against the published snapshot and meters it', async () => {
    repository.findPublicTarget.mockResolvedValue(makeTarget());

    const result = await makeService().intake('liveslug123', {
      values: { name: 'Ada' },
    });

    expect(result.id).toBe('sub-1');
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        formId: 'form-1',
        formVersion: 1,
        organizationId: 'org-1',
        status: SubmissionStatus.SUBMITTED,
      }),
    );
    expect(entitlements.consume).toHaveBeenCalledWith('org-1', 'SUBMISSIONS', {
      idempotencyKey: 'submission:sub-1',
      refType: 'submission',
      refId: 'sub-1',
    });
  });

  it('quarantines as OVER_LIMIT at the cap — never rejects', async () => {
    repository.findPublicTarget.mockResolvedValue(makeTarget());
    entitlements.getMeterState.mockResolvedValue({ used: 50, limit: 50 });

    const result = await makeService().intake('liveslug123', { values: { name: 'Ada' } });

    expect(result.id).toBe('sub-1');
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ status: SubmissionStatus.OVER_LIMIT }),
    );
    expect(entitlements.consume).toHaveBeenCalled();
  });

  it('a metering failure never fails the intake', async () => {
    repository.findPublicTarget.mockResolvedValue(makeTarget());
    entitlements.consume.mockRejectedValue(new Error('redis down'));

    await expect(makeService().intake('liveslug123', { values: { name: 'Ada' } })).resolves.toEqual(
      { id: 'sub-1' },
    );
    expect(logger.error).toHaveBeenCalled();
  });

  it('rejects invalid submissions with field-level errors', async () => {
    repository.findPublicTarget.mockResolvedValue(makeTarget());

    await expect(makeService().intake('liveslug123', { values: {} })).rejects.toThrow(
      UnprocessableEntityException,
    );
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('skips required checks on conditionally hidden fields', async () => {
    repository.findPublicTarget.mockResolvedValue(makeTarget());

    // "reason" is required but only visible when email is non-empty.
    await expect(
      makeService().intake('liveslug123', { values: { name: 'Ada' } }),
    ).resolves.toBeDefined();

    // With email filled, the hidden-required rule activates.
    await expect(
      makeService().intake('liveslug123', {
        values: { name: 'Ada', email: 'ada@x.io' },
      }),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('strips unknown keys so stored data stays schema-shaped', async () => {
    repository.findPublicTarget.mockResolvedValue(makeTarget());

    await makeService().intake('liveslug123', {
      values: { name: 'Ada', __proto__pollution: 'x', junk: 'y' },
    });

    const stored = (repository.create.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(Object.keys(stored)).toEqual(['name']);
  });

  it('honeypot hits get a fake success and store nothing', async () => {
    repository.findPublicTarget.mockResolvedValue(makeTarget());

    const result = await makeService().intake('liveslug123', {
      values: { name: 'Bot' },
      website: 'http://spam.example',
    });

    expect(result.id).toEqual(expect.any(String));
    expect(repository.create).not.toHaveBeenCalled();
    expect(entitlements.consume).not.toHaveBeenCalled();
  });

  it.each([
    ['unknown slug', null],
    ['draft form', makeTarget({ form: { status: FormStatus.DRAFT } })],
    ['read-only org', makeTarget({ orgLifecycleState: OrgLifecycleState.EXPIRED_TRIAL })],
  ])('answers 404 for %s', async (_label, target) => {
    repository.findPublicTarget.mockResolvedValue(target);

    await expect(makeService().intake('liveslug123', { values: { name: 'A' } })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('getPublicForm returns the snapshot schema, not the draft', async () => {
    const draftSchema = { fields: [] };
    repository.findPublicTarget.mockResolvedValue(
      makeTarget({ form: { schema: draftSchema, version: 3 } }),
    );

    const dto = await makeService().getPublicForm('liveslug123');

    expect(dto.schema.fields).toHaveLength(3);
    expect(dto.version).toBe(1);
  });

  it('branding follows the removeBranding plan gate', async () => {
    repository.findPublicTarget.mockResolvedValue(makeTarget());
    entitlements.checkFeature.mockResolvedValueOnce(false);
    expect((await makeService().getPublicForm('liveslug123')).showBranding).toBe(true);

    repository.findPublicTarget.mockResolvedValue(makeTarget());
    entitlements.checkFeature.mockResolvedValueOnce(true);
    expect((await makeService().getPublicForm('liveslug123')).showBranding).toBe(false);
  });
});

describe('SubmissionsService — data views', () => {
  beforeEach(() => {
    formsRepository.findById.mockResolvedValue({ id: 'form-1', name: 'Intake', schema: SCHEMA });
    repository.findMany.mockResolvedValue({ submissions: [], total: 0 });
  });

  it('lists org-scoped submissions with the quarantine count', async () => {
    repository.countQuarantined.mockResolvedValue(3);
    entitlements.getMeterState.mockResolvedValue({ used: 53, limit: 50 });

    const result = await makeService().findAll(
      'form-1',
      { page: 1, pageSize: 25 } as any,
      USER as any,
    );

    expect(result.quarantinedCount).toBe(3);
    expect(repository.releaseQuarantined).not.toHaveBeenCalled();
  });

  it('releases quarantined rows once the meter has headroom (upgrade path)', async () => {
    repository.countQuarantined.mockResolvedValueOnce(3).mockResolvedValueOnce(0);
    entitlements.getMeterState.mockResolvedValue({ used: 53, limit: 500 });
    repository.releaseQuarantined.mockResolvedValue(3);

    await makeService().findAll('form-1', { page: 1, pageSize: 25 } as any, USER as any);

    expect(repository.releaseQuarantined).toHaveBeenCalledWith('org-1');
  });

  it('cross-org form access answers 404 and logs a security event', async () => {
    formsRepository.findById.mockResolvedValue(null);
    formsRepository.existsAnywhere.mockResolvedValue(true);

    await expect(
      makeService().findAll('form-1', { page: 1, pageSize: 25 } as any, USER as any),
    ).rejects.toThrow(NotFoundException);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('SECURITY: cross-org submissions access attempt'),
      'SubmissionsService',
    );
  });

  it('export derives columns from the published snapshot, excluding layout fields', async () => {
    repository.findLatestVersion.mockResolvedValue({
      version: 1,
      schema: {
        fields: [
          ...SCHEMA.fields,
          {
            id: 's1',
            type: 'section',
            label: 'Layout',
            required: false,
            config: {},
            sortOrder: 3,
            page: 1,
          },
        ],
      },
    });
    repository.findAllForExport.mockResolvedValue([]);

    const { columns } = await makeService().exportData('form-1', USER as any);

    expect(columns.map((c) => c.id)).toEqual(['name', 'email', 'reason']);
  });
});
