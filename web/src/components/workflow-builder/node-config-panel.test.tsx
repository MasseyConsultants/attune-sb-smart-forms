// Author: Robert Massey | Created: 2026-07-14 | Module: Web / Tests
// SB-020 form-first workflow UX: the start node binds the trigger form in
// plain language, and every token-capable text input offers clickable field
// chips so non-technical users never hand-type {{tokens}}.

import { fireEvent, render, screen } from '@testing-library/react';

import { NodeConfigPanel } from './node-config-panel';

const FIELD_OPTIONS = [
  { id: 'employee-name', label: 'Employee Name' },
  { id: 'employee-email', label: 'Your Email' },
] as const;

const FORM_OPTIONS = [
  { id: 'form-1', name: 'Time Off Request' },
  { id: 'form-2', name: 'Work Order Request' },
] as const;

function renderPanel(
  overrides: Partial<React.ComponentProps<typeof NodeConfigPanel>> = {},
): ReturnType<typeof render> & { onChange: jest.Mock } {
  const onChange = jest.fn();
  const utils = render(
    <NodeConfigPanel
      nodeId="n-1"
      nodeType="email"
      data={{}}
      fieldOptions={FIELD_OPTIONS}
      onChange={onChange}
      onDelete={jest.fn()}
      onClose={jest.fn()}
      {...overrides}
    />,
  );
  return { ...utils, onChange };
}

describe('NodeConfigPanel field chips', () => {
  it('renders a chip per form field under the email To input', () => {
    renderPanel();
    // To offers field chips; Subject/Body add the two run-fact chips too.
    expect(screen.getAllByRole('button', { name: 'Employee Name' })).toHaveLength(3);
    expect(screen.getAllByRole('button', { name: 'Form name' })).toHaveLength(2);
  });

  it('clicking a chip appends the {{token}} to the field value', () => {
    const { onChange } = renderPanel({ data: { subject: 'New request from' } });
    const subjectChips = screen.getAllByRole('button', { name: 'Employee Name' });
    fireEvent.click(subjectChips[1]!);
    expect(onChange).toHaveBeenCalledWith('subject', 'New request from {{employee-name}}');
  });

  it('multiline bodies append without forcing a space separator', () => {
    const { onChange } = renderPanel({ data: { body: 'Hi,\n' } });
    const bodyChips = screen.getAllByRole('button', { name: 'Your Email' });
    fireEvent.click(bodyChips[2]!);
    expect(onChange).toHaveBeenCalledWith('body', 'Hi,\n{{employee-email}}');
  });
});

describe('NodeConfigPanel start node (form binding)', () => {
  it('lists org forms and reports a selection', () => {
    const onTriggerFormChange = jest.fn();
    renderPanel({
      nodeType: 'start',
      triggerFormId: 'form-1',
      formOptions: FORM_OPTIONS,
      onTriggerFormChange,
    });

    const picker = screen.getByLabelText('Which form starts this flow?');
    expect(picker).toHaveValue('form-1');
    fireEvent.change(picker, { target: { value: 'form-2' } });
    expect(onTriggerFormChange).toHaveBeenCalledWith('form-2');
  });

  it('shows the bound form answers in plain language', () => {
    renderPanel({
      nodeType: 'start',
      triggerFormId: 'form-1',
      formOptions: FORM_OPTIONS,
      onTriggerFormChange: jest.fn(),
    });
    expect(screen.getByText('Answers this form collects')).toBeInTheDocument();
    expect(screen.getByText('Employee Name')).toBeInTheDocument();
    expect(screen.getByText('Your Email')).toBeInTheDocument();
  });

  it('disables the picker when the workflow is published (no change handler)', () => {
    renderPanel({
      nodeType: 'start',
      triggerFormId: 'form-1',
      formOptions: FORM_OPTIONS,
      onTriggerFormChange: undefined,
    });
    expect(screen.getByLabelText('Which form starts this flow?')).toBeDisabled();
  });

  it('never offers a delete button for the start node', () => {
    renderPanel({
      nodeType: 'start',
      triggerFormId: null,
      formOptions: FORM_OPTIONS,
      onTriggerFormChange: jest.fn(),
    });
    expect(screen.queryByRole('button', { name: /Delete node/ })).not.toBeInTheDocument();
  });
});
