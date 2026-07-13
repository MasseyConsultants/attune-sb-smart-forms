// Author: Robert Massey | Created: 2026-07-13 | Module: Web / SmartMapper Tests

import { fireEvent, render, screen } from '@testing-library/react';

import type { FieldCoordinateMapping, FieldDefinition } from '@attune-sb/shared-types';

import { DocumentFieldSidebar } from './document-field-sidebar';

function field(overrides: Partial<FieldDefinition>): FieldDefinition {
  return {
    id: 'f1',
    type: 'text',
    label: 'Full name',
    required: false,
    config: {},
    sortOrder: 0,
    page: 0,
    ...overrides,
  };
}

describe('DocumentFieldSidebar', () => {
  it('shows mapped position for a placed field and "Not placed" otherwise', () => {
    const fields = [
      field({ id: 'f1', label: 'Full name' }),
      field({ id: 'f2', label: 'Email', type: 'email' }),
    ];
    const mappings: FieldCoordinateMapping[] = [
      { fieldId: 'f1', fieldLabel: 'Full name', page: 0, x: 40, y: 60, width: 160, height: 20 },
    ];

    render(<DocumentFieldSidebar fields={fields} mappings={mappings} />);

    expect(screen.getByText('Page 1 · (40, 60)')).toBeInTheDocument();
    expect(screen.getByText('Not placed')).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
  });

  it('expands yesno fields into per-option draggable sub-rows', () => {
    const fields = [field({ id: 'f1', label: 'Approved?', type: 'yesno' })];

    render(<DocumentFieldSidebar fields={fields} mappings={[]} />);

    // Three option slots counted in the progress header.
    expect(screen.getByText('0 / 3')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Approved?'));
    expect(screen.getByText('Yes')).toBeInTheDocument();
    expect(screen.getByText('No')).toBeInTheDocument();
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('derives option rows from config.options for choice fields', () => {
    const fields = [
      field({
        id: 'f1',
        label: 'Shift',
        type: 'radio',
        config: { options: ['1st', '2nd', '3rd'] },
      }),
    ];

    render(<DocumentFieldSidebar fields={fields} mappings={[]} />);
    fireEvent.click(screen.getByText('Shift'));

    expect(screen.getByText('1st')).toBeInTheDocument();
    expect(screen.getByText('2nd')).toBeInTheDocument();
    expect(screen.getByText('3rd')).toBeInTheDocument();
  });

  it('renders an empty state when there are no mappable fields', () => {
    render(<DocumentFieldSidebar fields={[]} mappings={[]} />);
    expect(screen.getByText(/No mappable fields/)).toBeInTheDocument();
  });
});
