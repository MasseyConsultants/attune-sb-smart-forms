// Author: Robert Massey | Created: 2026-07-13 | Module: Workflows / Tests
// Public approval token lifecycle: 404 for unknown/malformed, 410 for used or
// expired, one decision per token, the decision recorded as the approval
// node's ledger step, and the orchestrator resumed down the decided branch.

import { GoneException, NotFoundException } from '@nestjs/common';

import { ApprovalsService } from './approvals.service';
import { hashApprovalToken } from './engine/adapters/approval-step.adapter';

const repository = {
  findApprovalTokenByHash: jest.fn(),
  markApprovalTokenUsed: jest.fn().mockResolvedValue({}),
  createRunStep: jest.fn().mockResolvedValue({}),
};
const orchestrator = { resume: jest.fn().mockResolvedValue(undefined) };
const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

const RAW_TOKEN = 'a'.repeat(64);

function tokenRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'tok-1',
    tokenHash: hashApprovalToken(RAW_TOKEN),
    runId: 'run-1',
    nodeId: 'a',
    organizationId: 'org-1',
    assignedTo: 'boss@acme.test',
    message: 'Please sign off',
    decision: null,
    note: null,
    expiresAt: new Date(Date.now() + 86_400_000),
    usedAt: null,
    run: { id: 'run-1', workflow: { name: 'Intake approval' } },
    ...overrides,
  };
}

const inAppNotifications = { emit: jest.fn().mockResolvedValue(undefined) };

function makeService(): ApprovalsService {
  // Reason: structural mocks stand in for Nest providers in unit tests.
  return new ApprovalsService(
    repository as any,
    orchestrator as any,
    logger as any,
    inAppNotifications as any,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  repository.findApprovalTokenByHash.mockResolvedValue(tokenRecord());
});

describe('ApprovalsService.getView', () => {
  it('returns landing-page context without run state or org internals', async () => {
    const view = await makeService().getView(RAW_TOKEN);
    expect(view).toEqual({
      workflowName: 'Intake approval',
      message: 'Please sign off',
      assignedTo: 'boss@acme.test',
      expiresAt: expect.any(String),
      decision: null,
      decidedAt: null,
    });
    expect(repository.findApprovalTokenByHash).toHaveBeenCalledWith(hashApprovalToken(RAW_TOKEN));
  });

  it('404s malformed tokens without touching the database', async () => {
    await expect(makeService().getView('short')).rejects.toThrow(NotFoundException);
    expect(repository.findApprovalTokenByHash).not.toHaveBeenCalled();
  });

  it('404s unknown tokens', async () => {
    repository.findApprovalTokenByHash.mockResolvedValue(null);
    await expect(makeService().getView(RAW_TOKEN)).rejects.toThrow(NotFoundException);
  });

  it('410s expired unused tokens but still renders used ones (shows the outcome)', async () => {
    repository.findApprovalTokenByHash.mockResolvedValue(
      tokenRecord({ expiresAt: new Date(Date.now() - 1000) }),
    );
    await expect(makeService().getView(RAW_TOKEN)).rejects.toThrow(GoneException);

    const decidedAt = new Date();
    repository.findApprovalTokenByHash.mockResolvedValue(
      tokenRecord({
        expiresAt: new Date(Date.now() - 1000),
        usedAt: decidedAt,
        decision: 'approved',
      }),
    );
    const view = await makeService().getView(RAW_TOKEN);
    expect(view.decision).toBe('approved');
    expect(view.decidedAt).toBe(decidedAt.toISOString());
  });
});

describe('ApprovalsService.decide', () => {
  it('marks the token used, writes the ledger step, and resumes down the branch', async () => {
    await makeService().decide(RAW_TOKEN, 'approved', 'LGTM');

    expect(repository.markApprovalTokenUsed).toHaveBeenCalledWith('tok-1', 'approved', 'LGTM');
    expect(repository.createRunStep).toHaveBeenCalledWith(
      expect.objectContaining({
        runId: 'run-1',
        nodeId: 'a',
        nodeType: 'approval',
        status: 'COMPLETED',
        output: expect.objectContaining({ decision: 'approved', note: 'LGTM' }),
      }),
    );
    expect(orchestrator.resume).toHaveBeenCalledWith({
      runId: 'run-1',
      branchHint: 'approved',
      resumeData: {
        approval_a: { decision: 'approved', note: 'LGTM', decidedBy: 'boss@acme.test' },
      },
    });
  });

  it('routes rejections down the rejected branch', async () => {
    await makeService().decide(RAW_TOKEN, 'rejected');
    expect(orchestrator.resume).toHaveBeenCalledWith(
      expect.objectContaining({ branchHint: 'rejected' }),
    );
  });

  it('410s a second decision on the same token (single use)', async () => {
    repository.findApprovalTokenByHash.mockResolvedValue(
      tokenRecord({ usedAt: new Date(), decision: 'approved' }),
    );
    await expect(makeService().decide(RAW_TOKEN, 'rejected')).rejects.toThrow(GoneException);
    expect(orchestrator.resume).not.toHaveBeenCalled();
  });

  it('410s decisions on expired tokens', async () => {
    repository.findApprovalTokenByHash.mockResolvedValue(
      tokenRecord({ expiresAt: new Date(Date.now() - 1000) }),
    );
    await expect(makeService().decide(RAW_TOKEN, 'approved')).rejects.toThrow(GoneException);
    expect(repository.markApprovalTokenUsed).not.toHaveBeenCalled();
  });
});
