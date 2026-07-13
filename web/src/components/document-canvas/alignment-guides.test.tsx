// Author: Robert Massey | Created: 2026-07-13 | Module: Web / SmartMapper Tests
// Purpose: Alignment-guide math — wrong snapping silently corrupts carefully
// placed coordinates, so the edge/centre pairing rules get direct coverage.

import type { FieldCoordinateMapping } from '@attune-sb/shared-types';

import { computeAlignmentGuides } from './alignment-guides';
import { effectiveRenderMode, mappingKey, snapToStep } from './canvas-utils';

function mapping(overrides: Partial<FieldCoordinateMapping>): FieldCoordinateMapping {
  return {
    fieldId: 'f1',
    fieldLabel: 'Field',
    page: 0,
    x: 0,
    y: 0,
    width: 100,
    height: 20,
    ...overrides,
  };
}

describe('computeAlignmentGuides', () => {
  it('snaps the left edge to a sibling left edge within threshold', () => {
    const dragging = mapping({ fieldId: 'a', x: 103, y: 200 });
    const sibling = mapping({ fieldId: 'b', x: 100, y: 50 });

    const result = computeAlignmentGuides(dragging, [sibling]);

    expect(result.snappedX).toBe(100);
    expect(result.guides).toContainEqual({ orientation: 'vertical', position: 100 });
  });

  it('does not snap when nothing is within threshold', () => {
    const dragging = mapping({ fieldId: 'a', x: 300, y: 300 });
    const sibling = mapping({ fieldId: 'b', x: 100, y: 50 });

    const result = computeAlignmentGuides(dragging, [sibling]);

    expect(result.snappedX).toBe(300);
    expect(result.snappedY).toBe(300);
    expect(result.guides).toHaveLength(0);
  });

  it('prefers the nearest snap when multiple siblings compete on one axis', () => {
    const dragging = mapping({ fieldId: 'a', x: 103, y: 500 });
    const near = mapping({ fieldId: 'b', x: 104, y: 50 });
    const far = mapping({ fieldId: 'c', x: 100, y: 50 });

    const result = computeAlignmentGuides(dragging, [near, far]);

    expect(result.snappedX).toBe(104);
  });

  it('snaps vertically to a sibling top edge', () => {
    const dragging = mapping({ fieldId: 'a', x: 400, y: 52 });
    const sibling = mapping({ fieldId: 'b', x: 100, y: 50 });

    const result = computeAlignmentGuides(dragging, [sibling]);

    expect(result.snappedY).toBe(50);
    expect(result.guides).toContainEqual({ orientation: 'horizontal', position: 50 });
  });
});

describe('canvas-utils', () => {
  it('mappingKey includes the answer option when present', () => {
    expect(mappingKey({ fieldId: 'f1' })).toBe('f1');
    expect(mappingKey({ fieldId: 'f1', answerOption: 'yes' })).toBe('f1:yes');
  });

  it('effectiveRenderMode defaults by answerOption presence', () => {
    expect(effectiveRenderMode(mapping({}))).toBe('value');
    expect(effectiveRenderMode(mapping({ answerOption: 'no' }))).toBe('checkmark');
    expect(effectiveRenderMode(mapping({ renderMode: 'highlight' }))).toBe('highlight');
  });

  it('snapToStep rounds to the nearest grid interval', () => {
    expect(snapToStep(12, 10)).toBe(10);
    expect(snapToStep(16, 10)).toBe(20);
    expect(snapToStep(25, 5)).toBe(25);
  });
});
