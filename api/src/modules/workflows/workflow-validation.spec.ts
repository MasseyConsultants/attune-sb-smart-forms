// Author: Robert Massey | Created: 2026-07-13 | Module: Workflows / Tests
// Graph-shape rules + the plan-tier node gate.

import type { WorkflowEdge, WorkflowNode } from '@attune-sb/shared-types';

import { nodesAboveTier, validateGraph } from './workflow-validation';

function node(id: string, type: string): WorkflowNode {
  return { id, type: type as WorkflowNode['type'], position: { x: 0, y: 0 }, data: {} };
}

function edge(id: string, source: string, target: string, label?: string): WorkflowEdge {
  return { id, source, target, label };
}

const LINEAR_NODES = [node('a', 'start'), node('b', 'email'), node('c', 'end')];
const LINEAR_EDGES = [edge('e1', 'a', 'b'), edge('e2', 'b', 'c')];

describe('validateGraph', () => {
  it('accepts a valid linear graph', () => {
    expect(validateGraph(LINEAR_NODES, LINEAR_EDGES)).toEqual([]);
  });

  it('rejects an empty graph', () => {
    expect(validateGraph([], [])).toEqual(['Workflow must have at least one node.']);
  });

  it('requires exactly one start node', () => {
    expect(validateGraph([node('a', 'email'), node('c', 'end')], [])).toContain(
      'Workflow must have exactly one start node.',
    );
    expect(validateGraph([node('a', 'start'), node('b', 'start'), node('c', 'end')], [])).toContain(
      'Workflow must have exactly one start node.',
    );
  });

  it('requires at least one end node', () => {
    expect(validateGraph([node('a', 'start'), node('b', 'email')], [])).toContain(
      'Workflow must have at least one end node.',
    );
  });

  it('rejects edges referencing unknown nodes', () => {
    const errors = validateGraph(LINEAR_NODES, [edge('e1', 'a', 'ghost')]);
    expect(errors.some((e) => e.includes('unknown target node "ghost"'))).toBe(true);
  });

  it('rejects duplicate node ids and unknown node types', () => {
    const errors = validateGraph([node('a', 'start'), node('a', 'end'), node('x', 'teleport')], []);
    expect(errors.some((e) => e.includes('Duplicate node id "a"'))).toBe(true);
    expect(errors.some((e) => e.includes('unknown type "teleport"'))).toBe(true);
  });

  it('flags nodes unreachable from start', () => {
    const errors = validateGraph([...LINEAR_NODES, node('island', 'notify')], LINEAR_EDGES);
    expect(errors.some((e) => e.includes('unreachable from start: island'))).toBe(true);
  });
});

describe('nodesAboveTier', () => {
  const mixed = [
    node('a', 'start'),
    node('b', 'approval'), // growth
    node('c', 'delay'), // business
    node('d', 'end'),
  ];

  it('core tier flags growth and business nodes', () => {
    expect(nodesAboveTier(mixed, 'core').sort()).toEqual(['approval', 'delay']);
  });

  it('growth tier flags only business nodes', () => {
    expect(nodesAboveTier(mixed, 'growth')).toEqual(['delay']);
  });

  it('business tier allows everything', () => {
    expect(nodesAboveTier(mixed, 'business')).toEqual([]);
  });

  it('dedupes repeated node types', () => {
    const nodes = [node('a', 'approval'), node('b', 'approval')];
    expect(nodesAboveTier(nodes, 'core')).toEqual(['approval']);
  });
});
