// Author: Robert Massey | Created: 2026-07-13 | Module: @attune-sb/form-engine tests
// DOM-level tests for the web FormRenderer: rendering, required validation,
// conditional visibility reacting to input, multi-page navigation, and submit.

import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import type { FormSchema } from '@attune-sb/shared-types';

import { FormRenderer } from '../src/components/form-renderer';

function field(
  id: string,
  overrides: Partial<FormSchema['fields'][number]> = {},
): FormSchema['fields'][number] {
  return {
    id,
    type: 'text',
    label: id,
    required: false,
    config: {},
    sortOrder: 0,
    page: 1,
    ...overrides,
  };
}

describe('FormRenderer', () => {
  it('renders fields sorted by sortOrder', () => {
    const schema: FormSchema = {
      fields: [
        field('second', { label: 'Second', sortOrder: 2 }),
        field('first', { label: 'First', sortOrder: 1 }),
      ],
    };
    render(<FormRenderer schema={schema} />);
    const labels = screen.getAllByText(/First|Second/).map((el) => el.textContent);
    expect(labels[0]).toContain('First');
  });

  it('blocks submit when a required field is empty and shows the error', () => {
    const onSubmit = jest.fn();
    const schema: FormSchema = {
      fields: [field('name', { label: 'Full name', required: true })],
    };
    render(<FormRenderer schema={schema} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText('Full name is required')).toBeInTheDocument();
  });

  it('submits collected values from the last page', async () => {
    const onSubmit = jest.fn();
    const schema: FormSchema = {
      fields: [field('name', { label: 'Full name', required: true })],
    };
    render(<FormRenderer schema={schema} onSubmit={onSubmit} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Ada Lovelace' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(onSubmit).toHaveBeenCalledWith({ name: 'Ada Lovelace' });
    expect(await screen.findByText('Thank you!')).toBeInTheDocument();
  });

  it('shows and hides conditional fields as values change', () => {
    const schema: FormSchema = {
      fields: [
        field('trigger', { label: 'Trigger' }),
        field('dependent', {
          label: 'Dependent',
          conditionalVisibility: {
            enabled: true,
            rules: [{ fieldId: 'trigger', operator: 'equals', value: 'show' }],
          },
        }),
      ],
    };
    render(<FormRenderer schema={schema} />);

    expect(screen.queryByText('Dependent')).not.toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'show' } });
    expect(screen.getByText('Dependent')).toBeInTheDocument();
  });

  it('navigates between pages and validates per page', () => {
    const schema: FormSchema = {
      fields: [
        field('p1', { label: 'Page one field', required: true, page: 1 }),
        field('p2', { label: 'Page two field', page: 2 }),
      ],
    };
    render(<FormRenderer schema={schema} />);

    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();

    // Next is blocked while the required field is empty.
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Page one field is required')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'ok' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Page two field')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('Page one field')).toBeInTheDocument();
  });

  it('follows navigation rules for branching pages', () => {
    const schema: FormSchema = {
      fields: [
        field('branch', { label: 'Branch', page: 1 }),
        field('pageTwo', { label: 'Page two', page: 2 }),
        field('pageThree', { label: 'Page three', page: 3 }),
      ],
      navigationRules: [
        { id: 'r1', fieldId: 'branch', operator: 'equals', value: 'skip', targetPage: 3 },
      ],
    };
    render(<FormRenderer schema={schema} />);

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'skip' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(screen.getByText('Page three')).toBeInTheDocument();
    expect(screen.queryByText('Page two')).not.toBeInTheDocument();
  });

  it('renders the custom success message from settings', async () => {
    const schema: FormSchema = {
      fields: [field('a', { label: 'A' })],
      settings: { successTitle: 'Received!', successMessage: 'We will be in touch.' },
    };
    render(<FormRenderer schema={schema} onSubmit={jest.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(await screen.findByText('Received!')).toBeInTheDocument();
    expect(screen.getByText('We will be in touch.')).toBeInTheDocument();
  });

  it('surfaces a submit error and stays on the form', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('intake unavailable'));
    const schema: FormSchema = { fields: [field('a', { label: 'A' })] };
    render(<FormRenderer schema={schema} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(await screen.findByText('intake unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Thank you!')).not.toBeInTheDocument();
  });
});
