// Author: Robert Massey | Created: 2026-07-13 | Module: Workflows / Tests
// S8 Growth adapters: approval (token creation, email links, pause), http
// (SSRF refusal, request/response shaping), switch (case matching), data
// transform (path mapping + scalar transforms), export (CSV attachment +
// EMAILS metering).

import type { StepContext } from '../step-adapter.interface';

import { ApprovalStepAdapter, hashApprovalToken } from './approval-step.adapter';
import { ConditionStepAdapter } from './condition-step.adapter';
import { DataTransformStepAdapter } from './data-transform-step.adapter';
import { ExportStepAdapter } from './export-step.adapter';
import { HttpStepAdapter } from './http-step.adapter';

jest.mock('dns/promises', () => ({
  lookup: jest.fn((hostname: string) =>
    hostname === 'hooks.example.com'
      ? Promise.resolve([{ address: '93.184.216.34', family: 4 }])
      : Promise.reject(new Error('ENOTFOUND')),
  ),
}));

const email = { send: jest.fn().mockResolvedValue(undefined) };
const entitlements = {
  getMeterState: jest.fn(),
  consume: jest.fn().mockResolvedValue({}),
  checkFeature: jest.fn().mockResolvedValue(false),
};
const repository = {
  createApprovalToken: jest.fn().mockResolvedValue({}),
  addRunArtifactBytes: jest.fn().mockResolvedValue({}),
};
const config = { get: jest.fn((_key: string, fallback: string) => fallback) };
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
      formData: { name: 'Jane', priority: 'Urgent', email: 'jane@acme.test' },
      _formId: 'form-1',
      _formName: 'Intake',
      _submissionId: 'sub-1',
      ...state,
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  entitlements.getMeterState.mockResolvedValue({ used: 0, limit: 100 });
  entitlements.checkFeature.mockResolvedValue(false);
});

describe('ApprovalStepAdapter', () => {
  const adapter = new ApprovalStepAdapter(
    // Reason: structural mocks stand in for Nest providers in unit tests.
    repository as any,
    email as any,
    entitlements as any,
    config as any,
    logger as any,
  );

  it('creates a hashed token, emails approve/reject links, and pauses', async () => {
    const result = await adapter.execute(
      ctx('approval', { to: 'boss@acme.test', message: 'Sign off for {{name}}' }),
    );

    expect(result.status).toBe('paused');

    const tokenRow = repository.createApprovalToken.mock.calls[0][0];
    expect(tokenRow.runId).toBe('run-1');
    expect(tokenRow.nodeId).toBe('n-1');
    expect(tokenRow.assignedTo).toBe('boss@acme.test');
    expect(tokenRow.message).toBe('Sign off for Jane');
    // Stored value is a SHA-256 hash, not the raw token
    expect(tokenRow.tokenHash).toMatch(/^[a-f0-9]{64}$/);

    const payload = email.send.mock.calls[0][0];
    expect(payload.to).toBe('boss@acme.test');
    // The emailed raw token hashes to exactly the stored hash
    const linkMatch = /approvals\/([a-f0-9]{64})\?decision=approved/.exec(payload.html);
    expect(linkMatch).not.toBeNull();
    expect(hashApprovalToken(linkMatch![1])).toBe(tokenRow.tokenHash);
    expect(payload.html).toContain('?decision=rejected');
  });

  it('interpolates the approver address from form data', async () => {
    await adapter.execute(ctx('approval', { to: '{{email}}' }));
    expect(repository.createApprovalToken.mock.calls[0][0].assignedTo).toBe('jane@acme.test');
  });

  it('defaults expiry to 7 days and caps it at 30', async () => {
    await adapter.execute(ctx('approval', { to: 'a@b.c' }));
    const defaultExpiry = repository.createApprovalToken.mock.calls[0][0].expiresAt as Date;
    const days = (defaultExpiry.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThan(7.1);

    await adapter.execute(ctx('approval', { to: 'a@b.c', expiresDays: 365 }));
    const capped = repository.createApprovalToken.mock.calls[1][0].expiresAt as Date;
    expect((capped.getTime() - Date.now()) / 86_400_000).toBeLessThan(30.1);
  });

  it('fails without a valid approver email', async () => {
    const result = await adapter.execute(ctx('approval', { to: 'not-an-email' }));
    expect(result.status).toBe('failed');
    expect(repository.createApprovalToken).not.toHaveBeenCalled();
  });
});

describe('HttpStepAdapter', () => {
  const adapter = new HttpStepAdapter(logger as any);
  const fetchMock = jest.fn();

  beforeEach(() => {
    global.fetch = fetchMock as unknown as typeof fetch;
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
  });

  it.each([
    'http://169.254.169.254/latest/meta-data/',
    'http://localhost:3101/api/v1/users',
    'http://10.0.0.1/hook',
    'file:///etc/passwd',
  ])('refuses %s without making a request', async (url) => {
    const result = await adapter.execute(ctx('webhook', { url }));
    expect(result.status).toBe('failed');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('POSTs form data to a safe URL and stores the parsed response in state', async () => {
    const result = await adapter.execute(
      ctx('webhook', { url: 'https://hooks.example.com/intake' }),
    );

    expect(result.status).toBe('completed');
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://hooks.example.com/intake');
    expect(init.method).toBe('POST');
    expect(init.redirect).toBe('error');
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body.formData).toEqual({ name: 'Jane', priority: 'Urgent', email: 'jane@acme.test' });

    const output = result.outputData?.['http_n-1'] as { statusCode: number; response: unknown };
    expect(output.statusCode).toBe(200);
    expect(output.response).toEqual({ ok: true });
  });

  it('interpolates a custom body and headers', async () => {
    await adapter.execute(
      ctx('api', {
        url: 'https://hooks.example.com/x',
        method: 'PUT',
        body: '{"who":"{{name}}"}',
        headers: { 'x-api-key': 'secret-{{priority}}' },
      }),
    );
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe('PUT');
    expect(String(init.body)).toBe('{"who":"Jane"}');
    expect((init.headers as Record<string, string>)['x-api-key']).toBe('secret-Urgent');
  });

  it('fails on non-2xx but still exposes the response for failure-edge handling', async () => {
    fetchMock.mockResolvedValue(new Response('nope', { status: 500 }));
    const result = await adapter.execute(ctx('webhook', { url: 'https://hooks.example.com/x' }));

    expect(result.status).toBe('failed');
    expect(result.error).toContain('HTTP 500');
    const output = result.outputData?.['http_n-1'] as { statusCode: number };
    expect(output.statusCode).toBe(500);
  });
});

describe('ConditionStepAdapter — switch mode', () => {
  const adapter = new ConditionStepAdapter();

  it('matches a case (case-insensitive) and emits activeBranch', async () => {
    const result = await adapter.execute(
      ctx('switch', { field: 'priority', cases: [{ value: 'urgent' }, { value: 'low' }] }),
    );
    expect(result.outputData?.activeBranch).toBe('urgent');
  });

  it('prefers an explicit nextNodeId on the matched case', async () => {
    const result = await adapter.execute(
      ctx('switch', {
        field: 'priority',
        cases: [{ value: 'Urgent', nextNodeId: 'escalate' }],
      }),
    );
    expect(result.nextNodeId).toBe('escalate');
  });

  it('falls to the default branch when nothing matches', async () => {
    const result = await adapter.execute(
      ctx('switch', { field: 'priority', cases: [{ value: 'low' }] }),
    );
    expect(result.outputData?.activeBranch).toBe('default');
    expect(result.nextNodeId).toBeUndefined();
  });
});

describe('DataTransformStepAdapter', () => {
  const adapter = new DataTransformStepAdapter();

  it('maps sources to targets with transforms', async () => {
    const result = await adapter.execute(
      ctx('data_transform', {
        mappings: [
          { source: 'name', target: 'customerName', transform: 'uppercase' },
          { source: '_formName', target: 'sourceForm' },
          { source: 'missing_field', target: 'fallback' },
        ],
      }),
    );

    expect(result.status).toBe('completed');
    expect(result.outputData).toEqual({
      customerName: 'JANE',
      sourceForm: 'Intake',
      fallback: null,
    });
  });

  it('refuses to overwrite engine built-ins (underscore targets)', async () => {
    const result = await adapter.execute(
      ctx('data_transform', { mappings: [{ source: 'name', target: '_formId' }] }),
    );
    expect(result.outputData).toEqual({});
  });

  it('fails when no mappings are configured', async () => {
    const result = await adapter.execute(ctx('data_transform', {}));
    expect(result.status).toBe('failed');
  });
});

describe('ExportStepAdapter', () => {
  const adapter = new ExportStepAdapter(
    // Reason: structural mocks stand in for Nest providers in unit tests.
    email as any,
    entitlements as any,
    logger as any,
  );

  it('emails a CSV of formData and meters EMAILS', async () => {
    const result = await adapter.execute(ctx('export', { to: 'ops@acme.test' }));

    expect(result.status).toBe('completed');
    const payload = email.send.mock.calls[0][0];
    expect(payload.to).toBe('ops@acme.test');
    expect(payload.attachments).toHaveLength(1);
    const csv = payload.attachments[0].content.toString('utf-8');
    expect(csv).toContain('Field,Value');
    expect(csv).toContain('name,Jane');
    expect(csv).toContain('Form,Intake');
    expect(entitlements.consume).toHaveBeenCalledWith(
      'org-1',
      'EMAILS',
      expect.objectContaining({ idempotencyKey: 'wfexport:run-1:n-1' }),
    );
  });

  it('escapes CSV cells containing commas and quotes', async () => {
    await adapter.execute(
      ctx('export', { to: 'a@b.c' }, { formData: { notes: 'said "hi", left' } }),
    );
    const csv = email.send.mock.calls[0][0].attachments[0].content.toString('utf-8');
    expect(csv).toContain('notes,"said ""hi"", left"');
  });

  it('skips at the EMAILS cap without sending', async () => {
    entitlements.getMeterState.mockResolvedValue({ used: 25, limit: 25 });
    const result = await adapter.execute(ctx('export', { to: 'a@b.c' }));
    expect(result.status).toBe('skipped');
    expect(email.send).not.toHaveBeenCalled();
  });
});
