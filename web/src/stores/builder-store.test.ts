// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Builder Store Tests
// Covers the S3 acceptance surface: add/config/reorder/remove fields, dirty
// tracking for autosave, and schema() output for save/publish payloads.

import { FormStatus, type Form } from '@attune-sb/shared-types';

import { useBuilderStore } from './builder-store';

const FORM: Form = {
  id: 'form-1',
  name: 'Intake',
  description: null,
  slug: 'abc123',
  status: FormStatus.DRAFT,
  version: 1,
  organizationId: 'org-1',
  createdAt: '2026-07-13T00:00:00Z',
  updatedAt: '2026-07-13T00:00:00Z',
  schema: {
    fields: [
      { id: 'a', type: 'text', label: 'A', required: false, config: {}, sortOrder: 0, page: 1 },
      { id: 'b', type: 'email', label: 'B', required: true, config: {}, sortOrder: 1, page: 1 },
      { id: 'c', type: 'number', label: 'C', required: false, config: {}, sortOrder: 2, page: 1 },
    ],
  },
};

function store() {
  return useBuilderStore.getState();
}

beforeEach(() => {
  store().reset();
  store().initialize(FORM);
});

describe('builder store — initialization', () => {
  it('hydrates from the form and starts clean', () => {
    expect(store().formId).toBe('form-1');
    expect(store().fields.map((f) => f.id)).toEqual(['a', 'b', 'c']);
    expect(store().dirty).toBe(false);
  });
});

describe('builder store — adding fields', () => {
  it('appends with registry defaults and selects the new field', () => {
    const id = store().addField('dropdown');

    const added = store().fields.find((f) => f.id === id);
    expect(added?.label).toBe('Dropdown');
    expect(added?.config).toEqual({ options: [] });
    expect(added?.sortOrder).toBe(3);
    expect(store().selectedFieldId).toBe(id);
    expect(store().dirty).toBe(true);
  });

  it('inserts at a drop index and resequences sortOrder', () => {
    const id = store().addField('rating', 1);

    expect(store().fields.map((f) => f.id)).toEqual(['a', id, 'b', 'c']);
    expect(store().fields.map((f) => f.sortOrder)).toEqual([0, 1, 2, 3]);
  });

  it('new fields inherit the page of their neighbours', () => {
    store().updateField('c', { page: 2 });
    const id = store().addField('text');
    expect(store().fields.find((f) => f.id === id)?.page).toBe(2);
  });
});

describe('builder store — drag ordering', () => {
  it('moves a field down and resequences', () => {
    store().moveField(0, 2);

    expect(store().fields.map((f) => f.id)).toEqual(['b', 'c', 'a']);
    expect(store().fields.map((f) => f.sortOrder)).toEqual([0, 1, 2]);
    expect(store().dirty).toBe(true);
  });

  it('moves a field up', () => {
    store().moveField(2, 0);
    expect(store().fields.map((f) => f.id)).toEqual(['c', 'a', 'b']);
  });

  it('ignores out-of-range moves', () => {
    store().moveField(0, 99);
    expect(store().fields.map((f) => f.id)).toEqual(['a', 'b', 'c']);
    expect(store().dirty).toBe(false);
  });
});

describe('builder store — field config', () => {
  it('patches a field and marks dirty', () => {
    store().updateField('a', { label: 'Full name', required: true });

    const field = store().fields.find((f) => f.id === 'a');
    expect(field?.label).toBe('Full name');
    expect(field?.required).toBe(true);
    expect(store().dirty).toBe(true);
  });

  it('removes a field, clears its selection, and resequences', () => {
    store().selectField('b');
    store().removeField('b');

    expect(store().fields.map((f) => f.id)).toEqual(['a', 'c']);
    expect(store().fields.map((f) => f.sortOrder)).toEqual([0, 1]);
    expect(store().selectedFieldId).toBeNull();
  });
});

describe('builder store — persistence handshake', () => {
  it('schema() returns the working fields + settings', () => {
    store().updateSettings({ submitButtonText: 'Send' });
    const schema = store().schema();

    expect(schema.fields).toHaveLength(3);
    expect(schema.settings?.submitButtonText).toBe('Send');
  });

  it('markSaved clears dirty and adopts server status/version', () => {
    store().updateField('a', { label: 'X' });
    expect(store().dirty).toBe(true);

    store().markSaved({ status: FormStatus.PUBLISHED, version: 2, slug: 'new-slug' });

    expect(store().dirty).toBe(false);
    expect(store().status).toBe(FormStatus.PUBLISHED);
    expect(store().version).toBe(2);
    expect(store().slug).toBe('new-slug');
  });
});
