// Author: Robert Massey | Created: 2026-07-13 | Module: Web / SmartMapper Tests
// Purpose: Candidates panel — grouping per field, counts, bulk + per-row
// accept/reject, and hover-to-highlight signalling.

import { fireEvent, render, screen } from '@testing-library/react';

import type { CandidateMapping } from '@attune-sb/shared-types';

import { DocumentCandidatesPanel } from './document-candidates-panel';

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

const CANDIDATES: CandidateMapping[] = [
  candidate(),
  candidate({
    fieldId: 'f2',
    fieldLabel: 'Aisles clear?',
    pdfLabelText: 'Aisles clear?',
    confidence: 70,
    status: 'review',
    answerOption: 'yes',
  }),
  candidate({
    fieldId: 'f2',
    fieldLabel: 'Aisles clear?',
    pdfLabelText: 'Aisles clear?',
    confidence: 70,
    status: 'review',
    answerOption: 'no',
  }),
];

function renderPanel(handlers: Partial<Record<string, jest.Mock>> = {}) {
  return render(
    <DocumentCandidatesPanel
      candidates={CANDIDATES}
      onAccept={handlers.onAccept ?? jest.fn()}
      onReject={handlers.onReject ?? jest.fn()}
      onAcceptAll={handlers.onAcceptAll ?? jest.fn()}
      onRejectAll={handlers.onRejectAll ?? jest.fn()}
      onHoverField={handlers.onHoverField ?? jest.fn()}
    />,
  );
}

describe('DocumentCandidatesPanel', () => {
  it('shows confidence counts and one row per field', () => {
    renderPanel();
    expect(screen.getByText('1 high confidence · 2 need review')).toBeInTheDocument();
    expect(screen.getByText('Full name')).toBeInTheDocument();
    // Yes/no group renders once with its options listed.
    expect(screen.getByText('Aisles clear?')).toBeInTheDocument();
    expect(screen.getByText('(Yes / No)')).toBeInTheDocument();
  });

  it('shows the matched PDF text when it differs from the field label', () => {
    renderPanel();
    expect(screen.getByText(/matched\s+“Name:”/)).toBeInTheDocument();
  });

  it('bulk accept/reject fire', () => {
    const onAcceptAll = jest.fn();
    const onRejectAll = jest.fn();
    renderPanel({ onAcceptAll, onRejectAll });

    fireEvent.click(screen.getByText('Accept all'));
    expect(onAcceptAll).toHaveBeenCalled();

    fireEvent.click(screen.getByText('Reject all'));
    expect(onRejectAll).toHaveBeenCalled();
  });

  it('per-row Use accepts every candidate in the group', () => {
    const onAccept = jest.fn();
    renderPanel({ onAccept });

    // Second row is the yes/no group with two entries.
    fireEvent.click(screen.getAllByText('Use')[1]);
    expect(onAccept).toHaveBeenCalledTimes(2);
  });

  it('signals hover enter/leave with the field id', () => {
    const onHoverField = jest.fn();
    renderPanel({ onHoverField });

    const row = screen.getByText('Full name').closest('li') as HTMLElement;
    fireEvent.mouseEnter(row);
    expect(onHoverField).toHaveBeenCalledWith('f1');
    fireEvent.mouseLeave(row);
    expect(onHoverField).toHaveBeenCalledWith(null);
  });
});
