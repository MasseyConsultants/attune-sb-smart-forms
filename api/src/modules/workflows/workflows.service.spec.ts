// Author: Robert Massey | Created: 2026-07-13 | Module: Workflows / Tests
// Publish FSM: graph validation, the plan-tier node gate (402 with upgrade
// URL), version snapshots, trigger-form requirement, and cross-org 404s.

import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { WorkflowStatus } from '@prisma/client';

import { WorkflowsService } from './workflows.service';

import { EntitlementExceededException } from '@/modules/entitlements/entitlement-exceeded.exception';

const repository = {
  findMany: jest.fn(),
  findById: jest.fn(),
  existsAnywhere: jest.fn().mockResolvedValue(false),
  create: jest.fn(),
  update: jest.fn().mockResolvedValue({}),
  softDelete: jest.fn().mockResolvedValue({}),
  createVersion: jest.fn().mockResolvedValue({}),
  findRuns: jest.fn(),
  findRun: jest.fn(),
  findRunSteps: jest.fn(),
};

const formsRepository = {
  findById: jest.fn(),
};

const entitlements = {
  getPlanSnapshot: jest.fn(),
};

const config = { get: jest.fn().mockReturnValue('http://localhost:3100') };
const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

const USER = {
  userId: 'user-1',
  email: 'owner@acme.test',
  role: 'OWNER',
  organizationId: 'org-1',
};

const VALID_NODES = [
  { id: 's', type: 'start', position: { x: 0, y: 0 }, data: {} },
  { id: 'm', type: 'email', position: { x: 0, y: 0 }, data: { to: 'a@b.c' } },
  { id: 'e', type: 'end', position: { x: 0, y: 0 }, data: {} },
];
const VALID_EDGES = [
  { id: 'e1', source: 's', target: 'm' },
  { id: 'e2', source: 'm', target: 'e' },
];

function makeWorkflow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'wf-1',
    name: 'My Flow',
    description: null,
    nodes: VALID_NODES,
    edges: VALID_EDGES,
    status: WorkflowStatus.DRAFT,
    version: 1,
    color: '#F97316',
    triggerFormId: 'form-1',
    organizationId: 'org-1',
    createdById: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

function makeService(): WorkflowsService {
  // Reason: structural mocks stand in for Nest providers in unit tests.
  return new WorkflowsService(
    repository as any,
    formsRepository as any,
    entitlements as any,
    config as any,
    logger as any,
  );
}

function planWithTier(tier: string) {
  return { planId: 'trial', definition: { features: { workflowNodeTier: tier } } };
}

beforeEach(() => {
  jest.clearAllMocks();
  config.get.mockReturnValue('http://localhost:3100');
  repository.findById.mockResolvedValue(makeWorkflow());
  repository.existsAnywhere.mockResolvedValue(false);
  formsRepository.findById.mockResolvedValue({ id: 'form-1', name: 'Intake' });
  entitlements.getPlanSnapshot.mockResolvedValue(planWithTier('core'));
});

describe('WorkflowsService — create', () => {
  it('seeds a start + end skeleton when created without nodes', async () => {
    repository.create.mockResolvedValue(makeWorkflow());
    const service = makeService();

    await service.create({ name: 'Fresh flow' } as never, USER as never);

    const created = repository.create.mock.calls[0][0];
    const types = (created.nodes as { type: string }[]).map((n) => n.type);
    expect(types).toEqual(['start', 'end']);
  });

  it('keeps caller-provided nodes untouched (library clones)', async () => {
    repository.create.mockResolvedValue(makeWorkflow());
    const service = makeService();

    await service.create({ name: 'Cloned', nodes: VALID_NODES } as never, USER as never);

    expect(repository.create.mock.calls[0][0].nodes).toEqual(VALID_NODES);
  });
});

describe('WorkflowsService — publish', () => {
  it('publishes a valid graph: snapshots a version and flips to PUBLISHED', async () => {
    await makeService().publish('wf-1', USER as any);

    expect(repository.createVersion).toHaveBeenCalledWith(
      expect.objectContaining({ workflowId: 'wf-1', version: 1, publishedBy: 'user-1' }),
    );
    expect(repository.update).toHaveBeenCalledWith('wf-1', 'org-1', {
      status: WorkflowStatus.PUBLISHED,
      version: 1,
    });
  });

  it('bumps the version when republishing after an unpublish cycle', async () => {
    // Unpublish already bumped version to 2; publish snapshots v2.
    repository.findById.mockResolvedValue(makeWorkflow({ version: 2 }));
    await makeService().publish('wf-1', USER as any);
    expect(repository.createVersion).toHaveBeenCalledWith(expect.objectContaining({ version: 2 }));
  });

  it('rejects an invalid graph with the validation errors', async () => {
    repository.findById.mockResolvedValue(makeWorkflow({ nodes: [VALID_NODES[1]], edges: [] }));
    await expect(makeService().publish('wf-1', USER as any)).rejects.toThrow(
      UnprocessableEntityException,
    );
    expect(repository.createVersion).not.toHaveBeenCalled();
  });

  it('rejects nodes above the plan tier with a 402 and upgrade URL', async () => {
    repository.findById.mockResolvedValue(
      makeWorkflow({
        nodes: [...VALID_NODES, { id: 'a', type: 'approval', position: { x: 0, y: 0 }, data: {} }],
        edges: [
          ...VALID_EDGES,
          { id: 'e3', source: 'm', target: 'a' },
          { id: 'e4', source: 'a', target: 'e' },
        ],
      }),
    );

    const err = await makeService()
      .publish('wf-1', USER as any)
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(EntitlementExceededException);
    const body = (err as EntitlementExceededException).getResponse() as {
      details: { entitlement: string; upgradeUrl: string };
    };
    expect(body.details.entitlement).toContain('approval');
    expect(body.details.upgradeUrl).toBe('http://localhost:3100/billing');
    expect(repository.createVersion).not.toHaveBeenCalled();
  });

  it('allows the same graph on a plan whose tier covers it', async () => {
    entitlements.getPlanSnapshot.mockResolvedValue(planWithTier('growth'));
    repository.findById.mockResolvedValue(
      makeWorkflow({
        nodes: [...VALID_NODES, { id: 'a', type: 'approval', position: { x: 0, y: 0 }, data: {} }],
        edges: [
          ...VALID_EDGES,
          { id: 'e3', source: 'm', target: 'a' },
          { id: 'e4', source: 'a', target: 'e' },
        ],
      }),
    );
    await makeService().publish('wf-1', USER as any);
    expect(repository.createVersion).toHaveBeenCalled();
  });

  it('requires a trigger form before publishing', async () => {
    repository.findById.mockResolvedValue(makeWorkflow({ triggerFormId: null }));
    await expect(makeService().publish('wf-1', USER as any)).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('rejects publishing an already-published workflow', async () => {
    repository.findById.mockResolvedValue(makeWorkflow({ status: WorkflowStatus.PUBLISHED }));
    await expect(makeService().publish('wf-1', USER as any)).rejects.toThrow(ConflictException);
  });
});

describe('WorkflowsService — FSM & guards', () => {
  it('unpublish flips PUBLISHED → DRAFT and bumps version', async () => {
    repository.findById.mockResolvedValue(makeWorkflow({ status: WorkflowStatus.PUBLISHED }));
    await makeService().unpublish('wf-1', USER as any);
    expect(repository.update).toHaveBeenCalledWith('wf-1', 'org-1', {
      status: WorkflowStatus.DRAFT,
      version: 2,
    });
  });

  it('blocks graph edits on a PUBLISHED workflow', async () => {
    repository.findById.mockResolvedValue(makeWorkflow({ status: WorkflowStatus.PUBLISHED }));
    await expect(makeService().update('wf-1', { nodes: [] } as any, USER as any)).rejects.toThrow(
      ConflictException,
    );
  });

  it('allows rename on a PUBLISHED workflow', async () => {
    repository.findById.mockResolvedValue(makeWorkflow({ status: WorkflowStatus.PUBLISHED }));
    await makeService().update('wf-1', { name: 'Renamed' } as any, USER as any);
    expect(repository.update).toHaveBeenCalled();
  });

  it('404s cross-org access and logs a security event', async () => {
    repository.findById.mockResolvedValue(null);
    repository.existsAnywhere.mockResolvedValue(true);

    await expect(makeService().findOne('wf-other', USER as any)).rejects.toThrow(NotFoundException);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('SECURITY: cross-org workflow access attempt'),
      'WorkflowsService',
    );
  });

  it('404s runs from another org', async () => {
    repository.findRun.mockResolvedValue({ id: 'run-1', organizationId: 'org-other' });
    await expect(makeService().findRun('run-1', USER as any)).rejects.toThrow(NotFoundException);
  });
});
