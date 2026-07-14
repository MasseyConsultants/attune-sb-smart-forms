// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Workflow Builder
// Purpose: The visual builder — React Flow canvas with the tier-gated click-
// to-add palette, edge labeling for branch routing, per-node config panel,
// save/publish with inline graph-validation errors and the 402 tier gate
// rendered as an upgrade prompt. Loaded via dynamic import (heavy bundle).

'use client';

import { useCallback, useMemo, useState } from 'react';

import type { WorkflowDetail, WorkflowNodeType } from '@attune-sb/shared-types';
import { WorkflowStatus } from '@attune-sb/shared-types';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
} from '@xyflow/react';
import type { Connection, Edge, Node } from '@xyflow/react';
import { Activity, ChevronDown, Loader2, Lock, Rocket, Save, Undo2 } from 'lucide-react';
import Link from 'next/link';

import '@xyflow/react/dist/style.css';

import { NODE_META, PALETTE_GROUPS, isAboveTier } from './node-catalog';
import { NodeConfigPanel } from './node-config-panel';
import { TriggerFormContext, type TriggerFormInfo } from './trigger-form-context';
import { WorkflowNode } from './workflow-node';

import { UpgradeCta } from '@/components/billing/upgrade-cta';
import { Button } from '@/components/ui/button';
import { useEntitlement } from '@/hooks/use-billing';
import { LimitExceededError, useForm, useFormsList } from '@/hooks/use-forms';
import { useSaveWorkflow, useWorkflowAction } from '@/hooks/use-workflows';
import { cn } from '@/lib/utils';

const NODE_TYPES = Object.fromEntries(Object.keys(NODE_META).map((type) => [type, WorkflowNode]));

const EDGE_LABEL_PRESETS = ['', 'Yes', 'No', 'Approved', 'Rejected', 'default', 'failure'];

function toFlowNodes(workflow: WorkflowDetail): Node[] {
  return workflow.nodes.map((n) => ({
    id: n.id,
    type: n.type,
    position: n.position,
    data: n.data ?? {},
  }));
}

function toFlowEdges(workflow: WorkflowDetail): Edge[] {
  return workflow.edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
  }));
}

export interface WorkflowBuilderProps {
  readonly workflow: WorkflowDetail;
}

export function WorkflowBuilder({ workflow }: WorkflowBuilderProps): React.ReactElement {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(toFlowNodes(workflow));
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(toFlowEdges(workflow));
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [limitHit, setLimitHit] = useState<LimitExceededError | null>(null);

  const orgTier = useEntitlement('workflowNodeTier');
  const save = useSaveWorkflow(workflow.id);
  const action = useWorkflowAction(workflow.id);
  const triggerForm = useForm(workflow.triggerFormId ?? '');
  const formsList = useFormsList();

  const published = workflow.status === WorkflowStatus.PUBLISHED;
  const editable = !published;

  const fieldOptions = useMemo(() => {
    const fields = triggerForm.data?.schema?.fields ?? [];
    // Layout-only field types carry no submission value — hide from pickers.
    const displayOnly = new Set(['section', 'pagebreak', 'thankyou']);
    return fields
      .filter((f) => !displayOnly.has(f.type))
      .map((f) => ({ id: f.id, label: f.label || f.id, type: f.type }));
  }, [triggerForm.data]);

  // Feeds the start node's form card (SB-020) — name + fields on the canvas.
  const triggerFormInfo = useMemo<TriggerFormInfo>(
    () => ({
      formName: workflow.triggerFormId
        ? (triggerForm.data?.name ?? workflow.triggerFormName)
        : null,
      fields: fieldOptions,
    }),
    [workflow.triggerFormId, workflow.triggerFormName, triggerForm.data, fieldOptions],
  );

  const formOptions = useMemo(
    () => (formsList.data?.forms ?? []).map((f) => ({ id: f.id, name: f.name })),
    [formsList.data],
  );

  const handleTriggerFormChange = useCallback(
    (formId: string): void => {
      setFeedback(null);
      save.mutate(
        { triggerFormId: formId || null },
        {
          onSuccess: () => setFeedback('Trigger form updated'),
          onError: (err) => setFeedback(err instanceof Error ? err.message : 'Update failed'),
        },
      );
    },
    [save],
  );

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId) ?? null;

  const markDirty = useCallback((): void => {
    setDirty(true);
    setFeedback(null);
    setLimitHit(null);
  }, []);

  const addNode = useCallback(
    (type: WorkflowNodeType): void => {
      const meta = NODE_META[type];
      const id = `${type}-${Date.now().toString(36)}`;
      setNodes((current) => [
        ...current,
        {
          id,
          type,
          position: { x: 260 + Math.random() * 160, y: 160 + Math.random() * 160 },
          data: { ...(meta?.defaultData ?? {}) },
        },
      ]);
      setSelectedNodeId(id);
      setSelectedEdgeId(null);
      markDirty();
    },
    [setNodes, markDirty],
  );

  const updateNodeData = useCallback(
    (key: string, value: unknown): void => {
      if (!selectedNodeId) {
        return;
      }
      setNodes((current) =>
        current.map((n) =>
          n.id === selectedNodeId ? { ...n, data: { ...n.data, [key]: value } } : n,
        ),
      );
      markDirty();
    },
    [selectedNodeId, setNodes, markDirty],
  );

  const deleteSelectedNode = useCallback((): void => {
    if (!selectedNodeId) {
      return;
    }
    setNodes((current) => current.filter((n) => n.id !== selectedNodeId));
    setEdges((current) =>
      current.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId),
    );
    setSelectedNodeId(null);
    markDirty();
  }, [selectedNodeId, setNodes, setEdges, markDirty]);

  const onConnect = useCallback(
    (connection: Connection): void => {
      setEdges((current) => addEdge(connection, current));
      markDirty();
    },
    [setEdges, markDirty],
  );

  const setEdgeLabel = useCallback(
    (label: string): void => {
      if (!selectedEdgeId) {
        return;
      }
      setEdges((current) =>
        current.map((e) => (e.id === selectedEdgeId ? { ...e, label: label || undefined } : e)),
      );
      markDirty();
    },
    [selectedEdgeId, setEdges, markDirty],
  );

  const serializeGraph = useCallback(() => {
    return {
      nodes: nodes.map((n) => ({
        id: n.id,
        type: n.type as WorkflowNodeType,
        position: n.position,
        data: (n.data ?? {}) as Record<string, unknown>,
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        label: typeof e.label === 'string' ? e.label : undefined,
      })),
    };
  }, [nodes, edges]);

  const handleSave = useCallback((): void => {
    setFeedback(null);
    save.mutate(serializeGraph(), {
      onSuccess: () => {
        setDirty(false);
        setFeedback('Saved');
      },
      onError: (err) => setFeedback(err instanceof Error ? err.message : 'Save failed'),
    });
  }, [save, serializeGraph]);

  const handlePublishToggle = useCallback((): void => {
    setFeedback(null);
    setLimitHit(null);
    const publishAction = (): void =>
      action.mutate(published ? 'unpublish' : 'publish', {
        onSuccess: (data) =>
          setFeedback(
            data.status === WorkflowStatus.PUBLISHED
              ? `Published v${data.version} — live on new submissions`
              : 'Unpublished — back to draft',
          ),
        onError: (err) => {
          if (err instanceof LimitExceededError) {
            setLimitHit(err);
          } else {
            setFeedback(err instanceof Error ? err.message : 'Action failed');
          }
        },
      });

    if (!published && dirty) {
      // Publish snapshots the server copy — flush edits first.
      save.mutate(serializeGraph(), {
        onSuccess: () => {
          setDirty(false);
          publishAction();
        },
        onError: (err) => setFeedback(err instanceof Error ? err.message : 'Save failed'),
      });
    } else {
      publishAction();
    }
  }, [action, published, dirty, save, serializeGraph]);

  const busy = save.isPending || action.isPending;

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-semibold">{workflow.name}</h1>
          <p className="text-xs text-muted-foreground">
            {workflow.triggerFormName ? (
              <>Triggered by “{workflow.triggerFormName}”</>
            ) : (
              'No form linked — click the green start node to choose one'
            )}
            {published && ` · published v${workflow.version}`}
          </p>
        </div>
        {feedback && <span className="text-xs text-muted-foreground">{feedback}</span>}
        <Button asChild size="sm" variant="outline">
          <Link href={`/workflows/${workflow.id}/runs`}>
            <Activity className="mr-1.5 h-3.5 w-3.5" />
            Runs
          </Link>
        </Button>
        <Button size="sm" variant="outline" onClick={handleSave} disabled={busy || !editable}>
          {save.isPending ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="mr-1.5 h-3.5 w-3.5" />
          )}
          Save
        </Button>
        <Button size="sm" onClick={handlePublishToggle} disabled={busy}>
          {action.isPending ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : published ? (
            <Undo2 className="mr-1.5 h-3.5 w-3.5" />
          ) : (
            <Rocket className="mr-1.5 h-3.5 w-3.5" />
          )}
          {published ? 'Unpublish' : 'Publish'}
        </Button>
      </div>

      {limitHit && <UpgradeCta limitLabel="workflow nodes on your plan" used={0} limit={0} />}
      {published && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          This workflow is live — unpublish it to edit the graph. Runs in flight finish on their
          pinned version.
        </p>
      )}

      {/* Canvas row */}
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-lg border">
        {/* Palette */}
        <div className="w-52 shrink-0 space-y-3 overflow-y-auto border-r bg-muted/20 p-3">
          {PALETTE_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <ChevronDown className="h-3 w-3" />
                {group.label}
              </p>
              <div className="space-y-1">
                {group.types.map((type) => {
                  const meta = NODE_META[type];
                  if (!meta) {
                    return null;
                  }
                  const locked = isAboveTier(type, orgTier);
                  return (
                    <button
                      key={type}
                      type="button"
                      disabled={!editable || locked}
                      onClick={() => addNode(type)}
                      title={
                        locked
                          ? 'Available on the Growth plan — upgrade to use this step'
                          : meta.description
                      }
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition-colors',
                        locked
                          ? 'cursor-not-allowed border-dashed opacity-45'
                          : 'bg-background hover:border-[var(--brand-primary,#F97316)]',
                        !editable && 'cursor-not-allowed opacity-45',
                      )}
                    >
                      <meta.icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="flex-1 truncate">{meta.label}</span>
                      {locked && <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {orgTier === 'core' && (
            <Link
              href="/billing"
              className="border-[var(--brand-primary,#F97316)]/40 block rounded-md border bg-orange-50 p-2 text-[10px] text-orange-800 hover:bg-orange-100"
            >
              Approvals, webhooks and more unlock on the Growth plan →
            </Link>
          )}
        </div>

        {/* Flow canvas */}
        <div className="min-w-0 flex-1">
          <TriggerFormContext.Provider value={triggerFormInfo}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={NODE_TYPES}
              onNodesChange={(changes) => {
                if (editable) {
                  onNodesChange(changes);
                  if (changes.some((c) => c.type === 'position' || c.type === 'remove')) {
                    markDirty();
                  }
                }
              }}
              onEdgesChange={(changes) => {
                if (editable) {
                  onEdgesChange(changes);
                  if (changes.some((c) => c.type === 'remove')) {
                    markDirty();
                  }
                }
              }}
              onConnect={editable ? onConnect : undefined}
              onNodeClick={(_event, n) => {
                setSelectedNodeId(n.id);
                setSelectedEdgeId(null);
              }}
              onEdgeClick={(_event, e) => {
                setSelectedEdgeId(e.id);
                setSelectedNodeId(null);
              }}
              onPaneClick={() => {
                setSelectedNodeId(null);
                setSelectedEdgeId(null);
              }}
              fitView
              proOptions={{ hideAttribution: true }}
              defaultEdgeOptions={{ type: 'smoothstep' }}
            >
              <Background gap={16} />
              <Controls showInteractive={false} />
              <MiniMap pannable zoomable className="!h-24 !w-36" />
            </ReactFlow>
          </TriggerFormContext.Provider>
        </div>

        {/* Config panel */}
        {selectedNode && (
          <NodeConfigPanel
            nodeId={selectedNode.id}
            nodeType={selectedNode.type as WorkflowNodeType}
            data={(selectedNode.data ?? {}) as Record<string, unknown>}
            fieldOptions={fieldOptions}
            onChange={updateNodeData}
            onDelete={deleteSelectedNode}
            onClose={() => setSelectedNodeId(null)}
            triggerFormId={workflow.triggerFormId}
            formOptions={formOptions}
            onTriggerFormChange={editable ? handleTriggerFormChange : undefined}
          />
        )}
        {selectedEdge && !selectedNode && (
          <div className="flex w-72 shrink-0 flex-col gap-3 border-l bg-background p-4">
            <span className="text-sm font-semibold">Edge label</span>
            <p className="text-[11px] text-muted-foreground">
              Labels route branches: <b>Yes/No</b> from conditions, <b>Approved/Rejected</b> from
              approvals, case values from switches, <b>failure</b> for error handling.
            </p>
            <select
              value={typeof selectedEdge.label === 'string' ? selectedEdge.label : ''}
              onChange={(e) => setEdgeLabel(e.target.value)}
              disabled={!editable}
              className="rounded-md border bg-background px-2 py-1.5 text-xs"
            >
              {EDGE_LABEL_PRESETS.map((preset) => (
                <option key={preset} value={preset}>
                  {preset === '' ? '(no label — default path)' : preset}
                </option>
              ))}
            </select>
            <input
              value={typeof selectedEdge.label === 'string' ? selectedEdge.label : ''}
              onChange={(e) => setEdgeLabel(e.target.value)}
              disabled={!editable}
              placeholder="or type a custom label"
              className="rounded-md border bg-background px-2 py-1.5 text-xs"
            />
          </div>
        )}
      </div>
    </div>
  );
}
