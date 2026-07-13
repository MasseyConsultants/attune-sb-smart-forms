// Author: Robert Massey | Created: 2026-07-13 | Module: Workflows / Engine
// Purpose: condition + switch nodes. Condition evaluates one field against an
// operator and routes to trueNodeId/falseNodeId (or, when those are unset,
// the orchestrator matches the boolean result against edge labels). Switch
// (S8, Growth tier) matches the field value against its cases and emits
// activeBranch for edge-label routing — enterprise handles both in one
// adapter and so do we.

import { Injectable } from '@nestjs/common';

import type { StepAdapter, StepContext, StepResult } from '../step-adapter.interface';
import { resolvePath } from '../template-interpolation';

type Operator =
  'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';

function evaluate(actual: unknown, operator: Operator, expected: unknown): boolean {
  switch (operator) {
    case 'equals':
      return String(actual ?? '') === String(expected ?? '');
    case 'not_equals':
      return String(actual ?? '') !== String(expected ?? '');
    case 'contains':
      return String(actual ?? '')
        .toLowerCase()
        .includes(String(expected ?? '').toLowerCase());
    case 'greater_than':
      return Number(actual) > Number(expected);
    case 'less_than':
      return Number(actual) < Number(expected);
    case 'is_empty':
      return actual === null || actual === undefined || String(actual).trim() === '';
    case 'is_not_empty':
      return !(actual === null || actual === undefined || String(actual).trim() === '');
    default: {
      const exhaustive: never = operator;
      throw new Error(`Unhandled operator: ${String(exhaustive)}`);
    }
  }
}

interface SwitchCase {
  readonly value: string;
  readonly nextNodeId?: string;
}

@Injectable()
export class ConditionStepAdapter implements StepAdapter {
  readonly handles = ['condition', 'switch'] as const;

  execute(ctx: StepContext): Promise<StepResult> {
    const data = ctx.nodeData;
    const field = String(data['field'] ?? data['fieldId'] ?? '');

    // Bare field ids resolve inside formData; dotted paths and root keys
    // (built-ins like _formName, upstream outputs like emailSentTo) from root.
    const actual = field.includes('.')
      ? resolvePath(ctx.state, field)
      : (resolvePath(ctx.state, `formData.${field}`) ?? resolvePath(ctx.state, field));

    if (ctx.nodeType === 'switch') {
      return Promise.resolve(this.executeSwitch(data, field, actual));
    }

    const operator = (data['operator'] as Operator) ?? 'equals';
    const result = evaluate(actual, operator, data['value']);
    const explicitTarget = result ? data['trueNodeId'] : data['falseNodeId'];

    return Promise.resolve({
      status: 'completed',
      nextNodeId: typeof explicitTarget === 'string' && explicitTarget ? explicitTarget : undefined,
      outputData: {
        conditionResult: result,
        _conditionField: field,
        _conditionActualValue: actual ?? null,
      },
    });
  }

  /**
   * Matches the field value against cases by case-insensitive string equality.
   * activeBranch is the matched case value (or 'default'), which the
   * orchestrator resolves against edge labels; an explicit nextNodeId on the
   * matched case wins when set.
   */
  private executeSwitch(data: Record<string, unknown>, field: string, actual: unknown): StepResult {
    const cases = Array.isArray(data['cases']) ? (data['cases'] as SwitchCase[]) : [];
    const actualText = String(actual ?? '')
      .toLowerCase()
      .trim();
    const matched = cases.find(
      (c) =>
        String(c.value ?? '')
          .toLowerCase()
          .trim() === actualText,
    );

    return {
      status: 'completed',
      nextNodeId:
        matched && typeof matched.nextNodeId === 'string' && matched.nextNodeId
          ? matched.nextNodeId
          : undefined,
      outputData: {
        activeBranch: matched ? String(matched.value) : 'default',
        _switchField: field,
        _switchActualValue: actual ?? null,
      },
    };
  }
}
