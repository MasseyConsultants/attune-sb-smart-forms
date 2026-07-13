// Author: Robert Massey | Created: 2026-07-13 | Module: Workflows / Tests
// The engine loop: linear walks, condition branching via explicit targets and
// edge labels, failure semantics (failure edge vs run FAILED), skipped steps
// advancing, cycle protection, and replay idempotency.

import { WorkflowRunStatus } from '@prisma/client';

import type { StepResult } from './step-adapter.interface';
import { WorkflowOrchestratorService } from './workflow-orchestrator.service';

const repository = {
  findRun: jest.fn(),
  findVersion: jest.fn(),
  updateRun: jest.fn().mockResolvedValue({}),
  createRunStep: jest.fn().mockResolvedValue({}),
};

const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

// Scriptable adapter doubles: nodeId → StepResult (or throw)
let emailScript: Record<string, StepResult | Error>;
let conditionScript: Record<string, StepResult>;

const emailAdapter = {
  handles: ['email'],
  execute: jest.fn((ctx: { nodeId: string }) => {
    const scripted = emailScript[ctx.nodeId];
    if (scripted instanceof Error) {
      return Promise.reject(scripted);
    }
    return Promise.resolve(
      scripted ?? { status: 'completed', outputData: { emailSentTo: 'x@y.z' } },
    );
  }),
};
const conditionAdapter = {
  handles: ['condition'],
  execute: jest.fn((ctx: { nodeId: string }) =>
    Promise.resolve(conditionScript[ctx.nodeId] ?? { status: 'completed' }),
  ),
};
const noopAdapter = (handles: string[]) => ({
  handles,
  execute: jest.fn().mockResolvedValue({ status: 'completed' }),
});

const pdfAdapter = noopAdapter(['pdf_generate']);
const fillAdapter = noopAdapter(['fill_document']);
const sendAdapter = noopAdapter(['send_document']);
const notifyAdapter = noopAdapter(['notify']);

function makeOrchestrator(): WorkflowOrchestratorService {
  // Reason: structural mocks stand in for Nest providers in unit tests.
  return new WorkflowOrchestratorService(
    repository as any,
    logger as any,
    conditionAdapter as any,
    emailAdapter as any,
    pdfAdapter as any,
    fillAdapter as any,
    sendAdapter as any,
    notifyAdapter as any,
  );
}

function node(id: string, type: string, data: Record<string, unknown> = {}) {
  return { id, type, position: { x: 0, y: 0 }, data };
}

function edge(id: string, source: string, target: string, label?: string) {
  return { id, source, target, label };
}

const RUN = {
  id: 'run-1',
  workflowId: 'wf-1',
  workflowVersion: 1,
  organizationId: 'org-1',
  status: WorkflowRunStatus.PENDING,
  state: { formData: { name: 'Jane' }, _formId: 'form-1' },
};

function pinGraph(nodes: unknown[], edges: unknown[]): void {
  repository.findVersion.mockResolvedValue({ version: 1, nodes, edges });
}

function runUpdates(): Array<Record<string, unknown>> {
  return repository.updateRun.mock.calls.map((c) => c[1]);
}

function finalStatus(): unknown {
  const updates = runUpdates().filter((u) => u.status !== undefined);
  return updates[updates.length - 1]?.status;
}

beforeEach(() => {
  jest.clearAllMocks();
  emailScript = {};
  conditionScript = {};
  repository.findRun.mockResolvedValue({ ...RUN });
  repository.updateRun.mockResolvedValue({});
  repository.createRunStep.mockResolvedValue({});
});

describe('WorkflowOrchestratorService — walks', () => {
  it('executes a linear graph start → email → end and completes', async () => {
    pinGraph(
      [node('s', 'start'), node('m', 'email', { to: 'a@b.c' }), node('e', 'end')],
      [edge('e1', 's', 'm'), edge('e2', 'm', 'e')],
    );
    await makeOrchestrator().execute('run-1');

    expect(emailAdapter.execute).toHaveBeenCalledTimes(1);
    expect(finalStatus()).toBe(WorkflowRunStatus.COMPLETED);
    // Ledger rows: start, email, end
    expect(repository.createRunStep).toHaveBeenCalledTimes(3);
  });

  it('routes a condition through the explicit trueNodeId', async () => {
    conditionScript['c'] = {
      status: 'completed',
      nextNodeId: 'yes',
      outputData: { conditionResult: true },
    };
    pinGraph(
      [
        node('s', 'start'),
        node('c', 'condition'),
        node('yes', 'email'),
        node('no', 'notify'),
        node('e', 'end'),
      ],
      [
        edge('e1', 's', 'c'),
        edge('e2', 'c', 'yes'),
        edge('e3', 'c', 'no'),
        edge('e4', 'yes', 'e'),
        edge('e5', 'no', 'e'),
      ],
    );
    await makeOrchestrator().execute('run-1');

    expect(emailAdapter.execute).toHaveBeenCalledTimes(1);
    expect(notifyAdapter.execute).not.toHaveBeenCalled();
    expect(finalStatus()).toBe(WorkflowRunStatus.COMPLETED);
  });

  it('routes a condition by edge label when no explicit target is set', async () => {
    conditionScript['c'] = { status: 'completed', outputData: { conditionResult: false } };
    pinGraph(
      [
        node('s', 'start'),
        node('c', 'condition'),
        node('yes', 'email'),
        node('no', 'notify'),
        node('e', 'end'),
      ],
      [
        edge('e1', 's', 'c'),
        edge('e2', 'c', 'yes', 'Yes'),
        edge('e3', 'c', 'no', 'No'),
        edge('e4', 'yes', 'e'),
        edge('e5', 'no', 'e'),
      ],
    );
    await makeOrchestrator().execute('run-1');

    expect(notifyAdapter.execute).toHaveBeenCalledTimes(1);
    expect(emailAdapter.execute).not.toHaveBeenCalled();
  });

  it('merges outputData into state across steps', async () => {
    pinGraph(
      [node('s', 'start'), node('m', 'email'), node('n', 'notify'), node('e', 'end')],
      [edge('e1', 's', 'm'), edge('e2', 'm', 'n'), edge('e3', 'n', 'e')],
    );
    await makeOrchestrator().execute('run-1');

    const notifyCtx = notifyAdapter.execute.mock.calls[0][0];
    expect(notifyCtx.state.emailSentTo).toBe('x@y.z');
    expect(notifyCtx.state.formData).toEqual({ name: 'Jane' });
  });
});

describe('WorkflowOrchestratorService — failures', () => {
  it('marks the run FAILED with the step error when a node fails without a failure edge', async () => {
    emailScript['m'] = { status: 'failed', error: 'SMTP exploded' };
    pinGraph(
      [node('s', 'start'), node('m', 'email'), node('e', 'end')],
      [edge('e1', 's', 'm'), edge('e2', 'm', 'e')],
    );
    await makeOrchestrator().execute('run-1');

    expect(finalStatus()).toBe(WorkflowRunStatus.FAILED);
    const failUpdate = runUpdates().find((u) => u.status === WorkflowRunStatus.FAILED);
    expect(failUpdate?.error).toContain('SMTP exploded');
    // The failed step is still in the ledger
    expect(repository.createRunStep.mock.calls.some((c) => c[0].status === 'FAILED')).toBe(true);
  });

  it('routes to the failure edge instead of failing when one exists', async () => {
    emailScript['m'] = { status: 'failed', error: 'boom' };
    pinGraph(
      [node('s', 'start'), node('m', 'email'), node('n', 'notify'), node('e', 'end')],
      [
        edge('e1', 's', 'm'),
        edge('e2', 'm', 'e'),
        edge('e3', 'm', 'n', 'failure'),
        edge('e4', 'n', 'e'),
      ],
    );
    await makeOrchestrator().execute('run-1');

    expect(notifyAdapter.execute).toHaveBeenCalledTimes(1);
    expect(finalStatus()).toBe(WorkflowRunStatus.COMPLETED);
    const notifyCtx = notifyAdapter.execute.mock.calls[0][0];
    expect(notifyCtx.state._lastError).toBe('boom');
  });

  it('catches adapter throws and treats them as failures', async () => {
    emailScript['m'] = new Error('adapter crashed');
    pinGraph(
      [node('s', 'start'), node('m', 'email'), node('e', 'end')],
      [edge('e1', 's', 'm'), edge('e2', 'm', 'e')],
    );
    await makeOrchestrator().execute('run-1');

    expect(finalStatus()).toBe(WorkflowRunStatus.FAILED);
  });

  it('skipped steps (metered action at cap) advance the run', async () => {
    emailScript['m'] = { status: 'skipped', error: 'EMAILS plan limit reached (25/25)' };
    pinGraph(
      [node('s', 'start'), node('m', 'email'), node('e', 'end')],
      [edge('e1', 's', 'm'), edge('e2', 'm', 'e')],
    );
    await makeOrchestrator().execute('run-1');

    expect(finalStatus()).toBe(WorkflowRunStatus.COMPLETED);
    expect(repository.createRunStep.mock.calls.some((c) => c[0].status === 'SKIPPED')).toBe(true);
  });

  it('fails a cyclic graph at the step ceiling instead of spinning forever', async () => {
    pinGraph(
      [node('s', 'start'), node('m', 'email'), node('e', 'end')],
      [edge('e1', 's', 'm'), edge('e2', 'm', 'm')], // m loops to itself
    );
    await makeOrchestrator().execute('run-1');

    expect(finalStatus()).toBe(WorkflowRunStatus.FAILED);
    const failUpdate = runUpdates().find((u) => u.status === WorkflowRunStatus.FAILED);
    expect(failUpdate?.error).toContain('maximum step count');
  });
});

describe('WorkflowOrchestratorService — idempotency & guards', () => {
  it('is a no-op for non-PENDING runs (BullMQ replay safety)', async () => {
    repository.findRun.mockResolvedValue({ ...RUN, status: WorkflowRunStatus.COMPLETED });
    await makeOrchestrator().execute('run-1');
    expect(repository.updateRun).not.toHaveBeenCalled();
  });

  it('fails cleanly when the pinned version is missing', async () => {
    repository.findVersion.mockResolvedValue(null);
    await makeOrchestrator().execute('run-1');
    expect(finalStatus()).toBe(WorkflowRunStatus.FAILED);
  });

  it('skips node types with no adapter yet and advances', async () => {
    pinGraph(
      [node('s', 'start'), node('a', 'approval'), node('e', 'end')],
      [edge('e1', 's', 'a'), edge('e2', 'a', 'e')],
    );
    await makeOrchestrator().execute('run-1');

    expect(finalStatus()).toBe(WorkflowRunStatus.COMPLETED);
    const skipped = repository.createRunStep.mock.calls.find((c) => c[0].nodeId === 'a');
    expect(skipped?.[0].status).toBe('SKIPPED');
  });
});
