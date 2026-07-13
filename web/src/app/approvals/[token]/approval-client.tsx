// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Public Approval
// Purpose: Client half of the approval landing page. A ?decision= query from
// the email buttons pre-selects the action but never auto-submits — email
// scanners prefetch links, and a prefetch must not approve anything.

'use client';

import { useEffect, useState } from 'react';

import type { ApprovalDecision, ApprovalPublicView } from '@attune-sb/shared-types';
import { CheckCircle2, Loader2, ShieldAlert, XCircle } from 'lucide-react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { BRAND } from '@/lib/brand';
import { cn } from '@/lib/utils';

interface Envelope<T> {
  readonly success: boolean;
  readonly data: T;
  readonly error?: { readonly code: string; readonly message: string };
}

type PageState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; view: ApprovalPublicView }
  | { kind: 'submitting'; view: ApprovalPublicView }
  | { kind: 'done'; decision: ApprovalDecision };

export function ApprovalClient({ token }: { readonly token: string }): React.ReactElement {
  const searchParams = useSearchParams();
  const preselected = searchParams.get('decision');

  const [state, setState] = useState<PageState>({ kind: 'loading' });
  const [note, setNote] = useState('');

  useEffect(() => {
    let cancelled = false;
    void (async (): Promise<void> => {
      try {
        const res = await fetch(`/api/approvals/${encodeURIComponent(token)}`);
        const envelope = (await res.json()) as Envelope<ApprovalPublicView>;
        if (cancelled) {
          return;
        }
        if (!res.ok || !envelope.success) {
          setState({
            kind: 'error',
            message: envelope.error?.message ?? 'This approval link is not valid.',
          });
          return;
        }
        if (envelope.data.decision) {
          setState({ kind: 'done', decision: envelope.data.decision });
          return;
        }
        setState({ kind: 'ready', view: envelope.data });
      } catch {
        if (!cancelled) {
          setState({ kind: 'error', message: 'Could not reach the server. Try again shortly.' });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const submit = async (decision: ApprovalDecision): Promise<void> => {
    if (state.kind !== 'ready') {
      return;
    }
    setState({ kind: 'submitting', view: state.view });
    try {
      const res = await fetch(`/api/approvals/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, note: note.trim() || undefined }),
      });
      if (!res.ok) {
        const envelope = (await res.json()) as Envelope<unknown>;
        setState({
          kind: 'error',
          message: envelope.error?.message ?? 'The decision could not be recorded.',
        });
        return;
      }
      setState({ kind: 'done', decision });
    } catch {
      setState({ kind: 'error', message: 'Could not reach the server. Try again shortly.' });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md space-y-6 rounded-xl border bg-white p-8 shadow-sm">
        <Image
          src={BRAND.logoDark}
          alt={BRAND.appName}
          width={160}
          height={32}
          className="object-contain"
          style={{ height: 'auto' }}
          unoptimized
        />

        {state.kind === 'loading' && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {state.kind === 'error' && (
          <div className="space-y-2 py-4 text-center">
            <ShieldAlert className="mx-auto h-8 w-8 text-red-400" />
            <p className="text-sm font-medium text-foreground">Link unavailable</p>
            <p className="text-xs text-muted-foreground">{state.message}</p>
          </div>
        )}

        {state.kind === 'done' && (
          <div className="space-y-2 py-4 text-center">
            {state.decision === 'approved' ? (
              <CheckCircle2 className="mx-auto h-8 w-8 text-green-500" />
            ) : (
              <XCircle className="mx-auto h-8 w-8 text-red-500" />
            )}
            <p className="text-sm font-medium text-foreground">
              {state.decision === 'approved' ? 'Approved' : 'Rejected'}
            </p>
            <p className="text-xs text-muted-foreground">
              The decision has been recorded and the workflow is continuing. You can close this
              page.
            </p>
          </div>
        )}

        {(state.kind === 'ready' || state.kind === 'submitting') && (
          <>
            <div className="space-y-1">
              <h1 className="text-lg font-semibold text-foreground">Your approval is requested</h1>
              <p className="text-xs text-muted-foreground">
                Workflow “{state.view.workflowName}” · sent to {state.view.assignedTo}
              </p>
            </div>

            {state.view.message && (
              <p className="whitespace-pre-line rounded-md bg-slate-50 p-3 text-sm text-slate-700">
                {state.view.message}
              </p>
            )}

            <label className="block space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Note (optional)</span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Add context for the requester…"
              />
            </label>

            <div className="flex gap-3">
              <Button
                className={cn(
                  'flex-1 bg-green-600 hover:bg-green-700',
                  preselected === 'approved' && 'ring-2 ring-green-300 ring-offset-1',
                )}
                disabled={state.kind === 'submitting'}
                onClick={() => void submit('approved')}
              >
                {state.kind === 'submitting' ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                )}
                Approve
              </Button>
              <Button
                variant="outline"
                className={cn(
                  'flex-1 border-red-300 text-red-700 hover:bg-red-50',
                  preselected === 'rejected' && 'ring-2 ring-red-300 ring-offset-1',
                )}
                disabled={state.kind === 'submitting'}
                onClick={() => void submit('rejected')}
              >
                <XCircle className="mr-1.5 h-4 w-4" />
                Reject
              </Button>
            </div>

            <p className="text-center text-[10px] text-muted-foreground">
              This link expires {new Date(state.view.expiresAt).toLocaleDateString()} and can be
              used once.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
