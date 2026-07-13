// Author: Robert Massey | Created: 2026-07-13 | Module: Workflows
// Purpose: Graph-integrity rules enforced on publish, ported from the
// enterprise workflow-validation.service: exactly one start, at least one end,
// edges reference real nodes, everything reachable from start. Plus the SMB
// addition the enterprise doesn't have: the plan-tier node gate.

import type {
  WorkflowEdge,
  WorkflowNode,
  WorkflowNodeTier,
  WorkflowNodeType,
} from '@attune-sb/shared-types';
import { NODE_TIER } from '@attune-sb/shared-types';

const TIER_ORDER: Record<WorkflowNodeTier, number> = { core: 0, growth: 1, business: 2 };

const KNOWN_NODE_TYPES = new Set<string>(Object.keys(NODE_TIER));

/** Graph-shape errors; empty array = valid. */
export function validateGraph(nodes: WorkflowNode[], edges: WorkflowEdge[]): string[] {
  const errors: string[] = [];

  if (nodes.length === 0) {
    return ['Workflow must have at least one node.'];
  }

  const ids = new Set<string>();
  for (const node of nodes) {
    if (ids.has(node.id)) {
      errors.push(`Duplicate node id "${node.id}".`);
    }
    ids.add(node.id);
    if (!KNOWN_NODE_TYPES.has(node.type)) {
      errors.push(`Node "${node.id}" has unknown type "${node.type}".`);
    }
  }

  const startNodes = nodes.filter((n) => n.type === 'start');
  if (startNodes.length !== 1) {
    errors.push('Workflow must have exactly one start node.');
  }
  if (!nodes.some((n) => n.type === 'end')) {
    errors.push('Workflow must have at least one end node.');
  }

  for (const edge of edges) {
    if (!ids.has(edge.source)) {
      errors.push(`Edge "${edge.id}" references unknown source node "${edge.source}".`);
    }
    if (!ids.has(edge.target)) {
      errors.push(`Edge "${edge.id}" references unknown target node "${edge.target}".`);
    }
  }

  // BFS reachability from start (only meaningful when the graph is sane so far)
  if (errors.length === 0 && startNodes.length === 1) {
    const adjacency = new Map<string, string[]>();
    for (const edge of edges) {
      const targets = adjacency.get(edge.source) ?? [];
      targets.push(edge.target);
      adjacency.set(edge.source, targets);
    }
    const visited = new Set<string>([startNodes[0].id]);
    const queue = [startNodes[0].id];
    while (queue.length > 0) {
      const current = queue.shift() as string;
      for (const next of adjacency.get(current) ?? []) {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
    const unreachable = nodes.filter((n) => !visited.has(n.id)).map((n) => n.id);
    if (unreachable.length > 0) {
      errors.push(`Nodes are unreachable from start: ${unreachable.join(', ')}.`);
    }
  }

  return errors;
}

/**
 * Node types above the org's plan tier. Non-empty = publish must be refused
 * with an upgrade prompt.
 */
export function nodesAboveTier(
  nodes: WorkflowNode[],
  orgTier: WorkflowNodeTier,
): WorkflowNodeType[] {
  const allowed = TIER_ORDER[orgTier];
  const over = new Set<WorkflowNodeType>();
  for (const node of nodes) {
    const tier = NODE_TIER[node.type];
    if (tier !== undefined && TIER_ORDER[tier] > allowed) {
      over.add(node.type);
    }
  }
  return [...over];
}
