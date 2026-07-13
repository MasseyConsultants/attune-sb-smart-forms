// Author: Robert Massey | Created: 2026-07-13 | Module: @attune-sb/form-engine
// Purpose: Single field presentation — label, description, input, and error.
// Layout-only field types (section, thankyou, pagebreak) short-circuit here.

'use client';

import React from 'react';

import { FieldInput } from './field-input';
import type { BaseFieldProps } from './field-props';

export function FieldWrapper(props: BaseFieldProps): React.ReactElement {
  const { field, error } = props;

  if (field.type === 'section') {
    return (
      <div className="border-border mt-2 border-b-2 pb-1">
        <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest">
          {field.label}
        </p>
        {field.description && (
          <p className="text-muted-foreground/70 mt-0.5 text-xs">{field.description}</p>
        )}
      </div>
    );
  }

  if (field.type === 'thankyou') {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-center">
        <p className="font-semibold text-green-700">{field.label}</p>
        {field.description && <p className="mt-1 text-sm text-green-600">{field.description}</p>}
      </div>
    );
  }

  if (field.type === 'pagebreak') {
    return <></>;
  }

  return (
    <div className="space-y-1.5">
      <label className="text-foreground block text-sm font-semibold">
        {field.label}
        {field.required && (
          <span className="text-destructive ml-1" aria-hidden>
            *
          </span>
        )}
      </label>
      {field.description && (
        <p className="text-muted-foreground text-xs leading-snug">{field.description}</p>
      )}
      <FieldInput {...props} />
      {error && (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
