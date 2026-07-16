// Author: Robert Massey | Created: 2026-07-16 | Module: Web / Admin Ops

'use client';

import { CheckCircle2, Loader2, RotateCcw, Trash2 } from 'lucide-react';

import { useDiscardJob, useOpsQueues, useRetryJob } from '@/hooks/use-admin-ops';
import { cn } from '@/lib/utils';

export function OpsQueuesTab(): React.ReactElement {
  const { data, isLoading } = useOpsQueues();
  const retry = useRetryJob();
  const discard = useDiscardJob();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center rounded-lg border p-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const queues = data?.queues ?? [];
  const failedJobs = data?.failedJobs ?? [];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        {queues.map((q) => (
          <div key={q.name} className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <p className="font-mono text-sm font-medium">{q.name}</p>
              {q.paused && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                  paused
                </span>
              )}
            </div>
            <div className="mt-3 grid grid-cols-5 gap-2 text-center">
              {(
                [
                  ['waiting', q.waiting],
                  ['active', q.active],
                  ['delayed', q.delayed],
                  ['failed', q.failed],
                  ['done', q.completed],
                ] as const
              ).map(([label, count]) => (
                <div key={label}>
                  <p
                    className={cn(
                      'text-lg font-semibold tabular-nums',
                      label === 'failed' && count > 0 && 'text-red-600',
                    )}
                  >
                    {count}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {failedJobs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-12 text-center">
          <CheckCircle2 className="h-8 w-8 text-green-500/60" />
          <p className="text-sm font-medium">No failed jobs</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border">
          <p className="border-b bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">
            Failed jobs
          </p>
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-2 font-medium">Queue / Job</th>
                <th className="px-4 py-2 font-medium">Failure</th>
                <th className="px-4 py-2 font-medium">Attempts</th>
                <th className="px-4 py-2 font-medium">When</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {failedJobs.map((job) => (
                <tr key={`${job.queue}-${job.id}`} className="hover:bg-muted/30">
                  <td className="px-4 py-2">
                    <p className="font-mono text-xs">{job.queue}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {job.name} · #{job.id}
                    </p>
                  </td>
                  <td
                    className="max-w-sm truncate px-4 py-2 text-xs text-red-600"
                    title={job.failedReason ?? ''}
                  >
                    {job.failedReason ?? '—'}
                  </td>
                  <td className="px-4 py-2 text-xs tabular-nums">{job.attemptsMade}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-xs text-muted-foreground">
                    {job.timestamp ? new Date(job.timestamp).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => retry.mutate({ queue: job.queue, jobId: job.id })}
                        disabled={retry.isPending}
                        title="Retry job"
                        className="rounded border p-1.5 hover:bg-muted disabled:opacity-40"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Discard job #${job.id} from ${job.queue}?`)) {
                            discard.mutate({ queue: job.queue, jobId: job.id });
                          }
                        }}
                        disabled={discard.isPending}
                        title="Discard job"
                        className="rounded border p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
