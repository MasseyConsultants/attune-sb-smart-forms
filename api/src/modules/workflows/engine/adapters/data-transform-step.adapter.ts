// Author: Robert Massey | Created: 2026-07-13 | Module: Workflows / Engine
// Purpose: data_transform node (Growth tier) — reshapes run state for
// downstream steps: dot-path source → flat target key with an optional
// scalar transform. Pure state manipulation; nothing metered.

import { Injectable } from '@nestjs/common';

import type { StepAdapter, StepContext, StepResult } from '../step-adapter.interface';
import { resolvePath } from '../template-interpolation';

type Transform = 'uppercase' | 'lowercase' | 'trim' | 'number' | 'string';

interface Mapping {
  readonly source: string;
  readonly target: string;
  readonly transform?: Transform;
}

function applyTransform(value: unknown, transform: Transform | undefined): unknown {
  if (transform === undefined) {
    return value;
  }
  switch (transform) {
    case 'uppercase':
      return String(value ?? '').toUpperCase();
    case 'lowercase':
      return String(value ?? '').toLowerCase();
    case 'trim':
      return String(value ?? '').trim();
    case 'number': {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    case 'string':
      return String(value ?? '');
    default: {
      const exhaustive: never = transform;
      throw new Error(`Unhandled transform: ${String(exhaustive)}`);
    }
  }
}

@Injectable()
export class DataTransformStepAdapter implements StepAdapter {
  readonly handles = ['data_transform'] as const;

  execute(ctx: StepContext): Promise<StepResult> {
    const raw = ctx.nodeData['mappings'];
    const mappings = Array.isArray(raw) ? (raw as Mapping[]) : [];
    if (mappings.length === 0) {
      return Promise.resolve({
        status: 'failed',
        error: 'Data transform node has no mappings configured',
      });
    }

    const outputData: Record<string, unknown> = {};
    for (const mapping of mappings) {
      const source = String(mapping.source ?? '').trim();
      const target = String(mapping.target ?? '').trim();
      if (!source || !target || target.startsWith('_')) {
        continue; // underscore keys are engine built-ins — not overwritable
      }
      // Bare keys resolve inside formData first, mirroring condition nodes.
      const value = source.includes('.')
        ? resolvePath(ctx.state, source)
        : (resolvePath(ctx.state, `formData.${source}`) ?? resolvePath(ctx.state, source));
      outputData[target] = applyTransform(value, mapping.transform) ?? null;
    }

    return Promise.resolve({ status: 'completed', outputData });
  }
}
