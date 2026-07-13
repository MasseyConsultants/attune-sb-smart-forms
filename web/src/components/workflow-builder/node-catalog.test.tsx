// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Tests
// The palette's tier gate must mirror the server's NODE_TIER table exactly —
// a node the UI offers but the publish gate rejects (or vice versa) is a
// confusing dead end.

import type { WorkflowNodeType } from '@attune-sb/shared-types';
import { NODE_TIER } from '@attune-sb/shared-types';

import { NODE_META, PALETTE_GROUPS, isAboveTier } from './node-catalog';

describe('node catalog', () => {
  it('has display metadata for every palette entry', () => {
    for (const group of PALETTE_GROUPS) {
      for (const type of group.types) {
        expect(NODE_META[type]).toBeDefined();
      }
    }
  });

  it('offers no Business-tier nodes in the palette (v1.1 scope)', () => {
    const offered = PALETTE_GROUPS.flatMap((g) => g.types);
    for (const type of offered) {
      expect(NODE_TIER[type]).not.toBe('business');
    }
  });

  it('never lists a node type twice across groups', () => {
    const offered = PALETTE_GROUPS.flatMap((g) => g.types);
    expect(new Set(offered).size).toBe(offered.length);
  });
});

describe('isAboveTier (palette gating)', () => {
  const growthNodes: WorkflowNodeType[] = [
    'approval',
    'webhook',
    'api',
    'switch',
    'data_transform',
    'export',
  ];
  const coreNodes: WorkflowNodeType[] = [
    'condition',
    'email',
    'pdf_generate',
    'fill_document',
    'send_document',
    'notify',
    'end',
  ];

  it('locks Growth nodes for core-tier (trial/free/solo) orgs', () => {
    for (const type of growthNodes) {
      expect(isAboveTier(type, 'core')).toBe(true);
    }
  });

  it('unlocks Growth nodes for growth-tier orgs', () => {
    for (const type of growthNodes) {
      expect(isAboveTier(type, 'growth')).toBe(false);
    }
  });

  it('never locks core nodes on any tier', () => {
    for (const type of coreNodes) {
      expect(isAboveTier(type, 'core')).toBe(false);
      expect(isAboveTier(type, 'growth')).toBe(false);
      expect(isAboveTier(type, 'business')).toBe(false);
    }
  });

  it('shows nothing as locked while the plan is still loading', () => {
    expect(isAboveTier('approval', undefined)).toBe(false);
  });
});
