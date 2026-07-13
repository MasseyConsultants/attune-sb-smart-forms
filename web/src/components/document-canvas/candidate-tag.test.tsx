// Author: Robert Massey | Created: 2026-07-13 | Module: Web / SmartMapper Tests
// Purpose: Candidate-tag review contract — Enter accepts, Escape rejects,
// arrows reposition. A regression here silently drops auto-map suggestions.

import { fireEvent, render, screen } from '@testing-library/react';

import type { CandidateMapping } from '@attune-sb/shared-types';

import { CandidateTag } from './candidate-tag';

const PAGE = { width: 612, height: 792 };

function candidate(overrides: Partial<CandidateMapping> = {}): CandidateMapping {
  return {
    fieldId: 'f1',
    fieldLabel: 'Full name',
    pdfLabelText: 'Name:',
    page: 0,
    x: 100,
    y: 200,
    width: 160,
    height: 20,
    confidence: 92,
    status: 'auto_accept',
    ...overrides,
  };
}

function renderTag(
  c: CandidateMapping,
  handlers: {
    onAccept?: jest.Mock;
    onReject?: jest.Mock;
    onMove?: jest.Mock;
  } = {},
) {
  return render(
    <CandidateTag
      candidate={c}
      pageDimension={PAGE}
      containerScale={1.5}
      onAccept={handlers.onAccept ?? jest.fn()}
      onReject={handlers.onReject ?? jest.fn()}
      onMove={handlers.onMove ?? jest.fn()}
    />,
  );
}

describe('CandidateTag', () => {
  it('shows the confidence and field label', () => {
    renderTag(candidate());
    expect(screen.getByText('92%')).toBeInTheDocument();
    expect(screen.getByText('Full name')).toBeInTheDocument();
  });

  it('accepts on Enter and rejects on Escape', () => {
    const onAccept = jest.fn();
    const onReject = jest.fn();
    renderTag(candidate(), { onAccept, onReject });

    const tag = screen.getByText('Full name').closest('[tabindex]') as HTMLElement;
    fireEvent.keyDown(tag, { key: 'Enter' });
    expect(onAccept).toHaveBeenCalledWith(expect.objectContaining({ fieldId: 'f1' }));

    fireEvent.keyDown(tag, { key: 'Escape' });
    expect(onReject).toHaveBeenCalledWith(expect.objectContaining({ fieldId: 'f1' }));
  });

  it('accepts and rejects via the hover buttons', () => {
    const onAccept = jest.fn();
    const onReject = jest.fn();
    renderTag(candidate(), { onAccept, onReject });

    fireEvent.mouseDown(screen.getByTitle('Accept mapping (Enter)'));
    expect(onAccept).toHaveBeenCalled();

    fireEvent.mouseDown(screen.getByTitle('Reject suggestion (Esc)'));
    expect(onReject).toHaveBeenCalled();
  });

  it('nudges with arrow keys', () => {
    const onMove = jest.fn();
    renderTag(candidate(), { onMove });

    const tag = screen.getByText('Full name').closest('[tabindex]') as HTMLElement;
    fireEvent.keyDown(tag, { key: 'ArrowRight' });
    expect(onMove).toHaveBeenLastCalledWith(expect.objectContaining({ x: 101, y: 200 }));
  });

  it('shows the answer-option badge and validation warning dot', () => {
    renderTag(candidate({ answerOption: 'na', status: 'review', validationNote: 'Boxes overlap' }));
    expect(screen.getByText('N/A')).toBeInTheDocument();
    expect(screen.getByTitle('Needs review: Boxes overlap')).toBeInTheDocument();
  });
});
