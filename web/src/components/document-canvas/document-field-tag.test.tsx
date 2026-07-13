// Author: Robert Massey | Created: 2026-07-13 | Module: Web / SmartMapper Tests
// Purpose: Field-tag interaction contract — keyboard nudges and deletes are
// the precision tools for coordinate mapping; a regression here corrupts
// every carefully placed box.

import { fireEvent, render, screen } from '@testing-library/react';

import type { FieldCoordinateMapping } from '@attune-sb/shared-types';

import { DocumentFieldTag } from './document-field-tag';

const PAGE = { width: 612, height: 792 };

function mapping(overrides: Partial<FieldCoordinateMapping> = {}): FieldCoordinateMapping {
  return {
    fieldId: 'f1',
    fieldLabel: 'Full name',
    page: 0,
    x: 100,
    y: 200,
    width: 160,
    height: 20,
    ...overrides,
  };
}

describe('DocumentFieldTag', () => {
  it('nudges 1pt with arrows and 10pt with Shift+arrow', () => {
    const onUpdate = jest.fn();
    render(
      <DocumentFieldTag
        mapping={mapping()}
        pageDimension={PAGE}
        containerScale={1.5}
        onUpdate={onUpdate}
        onRemove={jest.fn()}
      />,
    );

    const tag = screen.getByRole('button', { name: 'Mapping for Full name' });
    fireEvent.keyDown(tag, { key: 'ArrowRight' });
    expect(onUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ x: 101, y: 200 }));

    fireEvent.keyDown(tag, { key: 'ArrowDown', shiftKey: true });
    expect(onUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ x: 100, y: 210 }));
  });

  it('clamps nudges at the page origin', () => {
    const onUpdate = jest.fn();
    render(
      <DocumentFieldTag
        mapping={mapping({ x: 0, y: 0 })}
        pageDimension={PAGE}
        containerScale={1.5}
        onUpdate={onUpdate}
        onRemove={jest.fn()}
      />,
    );

    fireEvent.keyDown(screen.getByRole('button', { name: 'Mapping for Full name' }), {
      key: 'ArrowLeft',
    });
    expect(onUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ x: 0, y: 0 }));
  });

  it('removes the tag on Delete using the composite mapping key', () => {
    const onRemove = jest.fn();
    render(
      <DocumentFieldTag
        mapping={mapping({ answerOption: 'yes' })}
        pageDimension={PAGE}
        containerScale={1.5}
        onUpdate={jest.fn()}
        onRemove={onRemove}
      />,
    );

    fireEvent.keyDown(screen.getByRole('button', { name: 'Mapping for Full name' }), {
      key: 'Delete',
    });
    expect(onRemove).toHaveBeenCalledWith('f1:yes');
  });

  it('positions the box by PDF points × scale', () => {
    render(
      <DocumentFieldTag
        mapping={mapping({ x: 100, y: 200, width: 160, height: 20 })}
        pageDimension={PAGE}
        containerScale={2}
        onUpdate={jest.fn()}
        onRemove={jest.fn()}
      />,
    );

    const tag = screen.getByRole('button', { name: 'Mapping for Full name' });
    expect(tag).toHaveStyle({ left: '200px', top: '400px', width: '320px', height: '40px' });
  });

  it('snaps arrow-key movement to the grid when snapToGrid is on', () => {
    const onUpdate = jest.fn();
    render(
      <DocumentFieldTag
        mapping={mapping({ x: 100, y: 200 })}
        pageDimension={PAGE}
        containerScale={1.5}
        onUpdate={onUpdate}
        onRemove={jest.fn()}
        snapToGrid
        gridSize={10}
      />,
    );

    fireEvent.keyDown(screen.getByRole('button', { name: 'Mapping for Full name' }), {
      key: 'ArrowRight',
    });
    expect(onUpdate).toHaveBeenLastCalledWith(expect.objectContaining({ x: 110 }));
  });
});
