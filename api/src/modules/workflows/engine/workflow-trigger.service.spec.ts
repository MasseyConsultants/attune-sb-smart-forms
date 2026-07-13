// Author: Robert Massey | Created: 2026-07-13 | Module: Workflows / Tests
// The submission → workflow bridge: WORKFLOW_RUNS assert-before/consume-after,
// SKIPPED_LIMIT recording at cap, and the never-throw guarantee that protects
// intake.

import { WorkflowRunStatus } from '@prisma/client';

import { WorkflowTriggerService } from './workflow-trigger.service';

const repository = {
  findPublishedByTriggerForm: jest.fn(),
  createRun: jest.fn(),
};

const entitlements = {
  getMeterState: jest.fn(),
  consume: jest.fn().mockResolvedValue({}),
};

const queue = { add: jest.fn().mockResolvedValue({}) };
const logger = { log: jest.fn(), warn: jest.fn(), error: jest.fn() };

const TRIGGER = {
  submissionId: 'sub-1',
  formId: 'form-1',
  formName: 'Intake',
  organizationId: 'org-1',
  data: { name: 'Jane' },
};

function makeService(): WorkflowTriggerService {
  // Reason: structural mocks stand in for Nest providers in unit tests.
  return new WorkflowTriggerService(
    repository as any,
    entitlements as any,
    queue as any,
    logger as any,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  entitlements.getMeterState.mockResolvedValue({ used: 0, limit: 50 });
  entitlements.consume.mockResolvedValue({});
  repository.findPublishedByTriggerForm.mockResolvedValue([{ id: 'wf-1', version: 2 }]);
  repository.createRun.mockImplementation((data) => Promise.resolve({ id: 'run-1', ...data }));
});

describe('WorkflowTriggerService', () => {
  it('creates a PENDING run, consumes WORKFLOW_RUNS, and enqueues the job', async () => {
    await makeService().onSubmissionAccepted(TRIGGER);

    expect(repository.createRun).toHaveBeenCalledWith(
      expect.objectContaining({
        workflowId: 'wf-1',
        workflowVersion: 2,
        status: WorkflowRunStatus.PENDING,
        submissionId: 'sub-1',
        triggerType: 'submission',
      }),
    );
    const state = repository.createRun.mock.calls[0][0].state;
    expect(state.formData).toEqual({ name: 'Jane' });
    expect(state._formId).toBe('form-1');
    expect(state._formName).toBe('Intake');

    expect(entitlements.consume).toHaveBeenCalledWith('org-1', 'WORKFLOW_RUNS', {
      idempotencyKey: 'wfrun:run-1',
      refType: 'workflowRun',
      refId: 'run-1',
    });
    expect(queue.add).toHaveBeenCalledWith('execute-run', { runId: 'run-1' });
  });

  it('records SKIPPED_LIMIT at the WORKFLOW_RUNS cap — no enqueue, no consume', async () => {
    entitlements.getMeterState.mockResolvedValue({ used: 50, limit: 50 });

    await makeService().onSubmissionAccepted(TRIGGER);

    expect(repository.createRun).toHaveBeenCalledWith(
      expect.objectContaining({
        status: WorkflowRunStatus.SKIPPED_LIMIT,
        error: expect.stringContaining('WORKFLOW_RUNS plan limit reached'),
      }),
    );
    expect(entitlements.consume).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('starts one run per bound workflow, metering each', async () => {
    repository.findPublishedByTriggerForm.mockResolvedValue([
      { id: 'wf-1', version: 1 },
      { id: 'wf-2', version: 3 },
    ]);

    await makeService().onSubmissionAccepted(TRIGGER);

    expect(repository.createRun).toHaveBeenCalledTimes(2);
    expect(queue.add).toHaveBeenCalledTimes(2);
    expect(entitlements.consume).toHaveBeenCalledTimes(2);
  });

  it('does nothing when no published workflow is bound to the form', async () => {
    repository.findPublishedByTriggerForm.mockResolvedValue([]);
    await makeService().onSubmissionAccepted(TRIGGER);
    expect(repository.createRun).not.toHaveBeenCalled();
  });

  it('never throws — intake is protected from workflow failures', async () => {
    repository.findPublishedByTriggerForm.mockRejectedValue(new Error('db down'));
    await expect(makeService().onSubmissionAccepted(TRIGGER)).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalled();
  });

  it('never throws when enqueue fails (Redis down)', async () => {
    queue.add.mockRejectedValue(new Error('redis down'));
    await expect(makeService().onSubmissionAccepted(TRIGGER)).resolves.toBeUndefined();
    expect(logger.error).toHaveBeenCalled();
  });
});
