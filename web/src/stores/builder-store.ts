// Author: Robert Massey | Created: 2026-07-13 | Module: Web / Builder Store
// Purpose: Zustand store backing the form builder studio. Holds the working
// copy of a form (fields + settings), selection, and dirty tracking for
// autosave. Server persistence lives in the builder component — this store is
// pure client state so it stays trivially unit-testable.

'use client';

import { create } from 'zustand';

import { getFieldDefinition } from '@attune-sb/form-engine';
import type {
  FieldDefinition,
  FieldType,
  Form,
  FormSchema,
  FormSettings,
  FormStatus,
} from '@attune-sb/shared-types';

function makeFieldId(): string {
  return `fld_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Re-numbers sortOrder after any structural change so order is always dense. */
function resequence(fields: FieldDefinition[]): FieldDefinition[] {
  return fields.map((field, index) => ({ ...field, sortOrder: index }));
}

export interface BuilderState {
  formId: string | null;
  name: string;
  status: FormStatus | null;
  version: number;
  slug: string;
  fields: FieldDefinition[];
  settings: FormSettings;
  selectedFieldId: string | null;
  dirty: boolean;
  lastSavedAt: Date | null;

  initialize: (form: Form) => void;
  setName: (name: string) => void;
  updateSettings: (patch: Partial<FormSettings>) => void;
  addField: (type: FieldType, index?: number) => string;
  updateField: (id: string, patch: Partial<FieldDefinition>) => void;
  removeField: (id: string) => void;
  moveField: (fromIndex: number, toIndex: number) => void;
  selectField: (id: string | null) => void;
  markSaved: (form: Pick<Form, 'status' | 'version' | 'slug'>) => void;
  schema: () => FormSchema;
  reset: () => void;
}

const INITIAL = {
  formId: null,
  name: '',
  status: null,
  version: 1,
  slug: '',
  fields: [] as FieldDefinition[],
  settings: {} as FormSettings,
  selectedFieldId: null,
  dirty: false,
  lastSavedAt: null,
};

export const useBuilderStore = create<BuilderState>((set, get) => ({
  ...INITIAL,

  initialize: (form) =>
    set({
      formId: form.id,
      name: form.name,
      status: form.status,
      version: form.version,
      slug: form.slug,
      fields: resequence(form.schema?.fields ?? []),
      settings: form.schema?.settings ?? {},
      selectedFieldId: null,
      dirty: false,
      lastSavedAt: null,
    }),

  setName: (name) => set({ name, dirty: true }),

  updateSettings: (patch) =>
    set((state) => ({ settings: { ...state.settings, ...patch }, dirty: true })),

  addField: (type, index) => {
    const definition = getFieldDefinition(type);
    const state = get();
    // New fields land on the page of the field they were dropped next to.
    const anchor = index !== undefined ? state.fields[Math.max(index - 1, 0)] : undefined;
    const lastField = state.fields[state.fields.length - 1];
    const field: FieldDefinition = {
      id: makeFieldId(),
      type,
      label: definition?.label ?? type,
      required: false,
      config: { ...(definition?.defaultConfig ?? {}) },
      sortOrder: 0,
      page: anchor?.page ?? lastField?.page ?? 1,
    };

    const fields = [...state.fields];
    fields.splice(index ?? fields.length, 0, field);
    set({ fields: resequence(fields), selectedFieldId: field.id, dirty: true });
    return field.id;
  },

  updateField: (id, patch) =>
    set((state) => ({
      fields: state.fields.map((field) => (field.id === id ? { ...field, ...patch } : field)),
      dirty: true,
    })),

  removeField: (id) =>
    set((state) => ({
      fields: resequence(state.fields.filter((field) => field.id !== id)),
      selectedFieldId: state.selectedFieldId === id ? null : state.selectedFieldId,
      dirty: true,
    })),

  moveField: (fromIndex, toIndex) =>
    set((state) => {
      if (
        fromIndex === toIndex ||
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= state.fields.length ||
        toIndex >= state.fields.length
      ) {
        return state;
      }
      const fields = [...state.fields];
      const [moved] = fields.splice(fromIndex, 1);
      fields.splice(toIndex, 0, moved);
      return { ...state, fields: resequence(fields), dirty: true };
    }),

  selectField: (id) => set({ selectedFieldId: id }),

  markSaved: (form) =>
    set({
      status: form.status,
      version: form.version,
      slug: form.slug,
      dirty: false,
      lastSavedAt: new Date(),
    }),

  schema: () => {
    const state = get();
    return { fields: state.fields, settings: state.settings };
  },

  reset: () => set({ ...INITIAL }),
}));
