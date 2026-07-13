// Author: Robert Massey | Created: 2026-07-13 | Module: @attune-sb/form-engine
// Purpose: The web form renderer — multi-page navigation, live conditional
// visibility, page-scoped validation, and a submit hook. Consumed by the
// builder's live preview (onSubmit omitted → simulation) and the public
// /f/[slug] fill pages (onSubmit posts to the intake endpoint).

'use client';

import type { FieldDefinition, FormSchema } from '@attune-sb/shared-types';
import React, { useCallback, useMemo, useState } from 'react';

import { evaluateConditionalVisibility } from '../logic/conditional-visibility';
import { evaluateNavigationRules } from '../logic/navigation-rules';
import { validateForm } from '../logic/validate-form';

import { FieldWrapper } from './field-wrapper';

export type FormValues = Record<string, unknown>;

export interface FormRendererProps {
  readonly schema: FormSchema;
  readonly title?: string;
  readonly description?: string;
  /** Called after the last page validates. Omit for preview/simulation mode. */
  readonly onSubmit?: (values: FormValues) => Promise<void> | void;
  /** Disables every input (read-only orgs, closed forms). */
  readonly disabled?: boolean;
  /** Rendered under the submit button (e.g. "Powered by" branding). */
  readonly footer?: React.ReactNode;
}

interface PageGroup {
  readonly pageNum: number;
  readonly fields: FieldDefinition[];
}

function groupPages(fields: FieldDefinition[]): PageGroup[] {
  const map = new Map<number, FieldDefinition[]>();
  for (const field of fields) {
    const p = field.page ?? 1;
    const bucket = map.get(p);
    if (bucket) {
      bucket.push(field);
    } else {
      map.set(p, [field]);
    }
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([pageNum, pageFields]) => ({
      pageNum,
      fields: [...pageFields].sort((a, b) => a.sortOrder - b.sortOrder),
    }));
}

export function FormRenderer({
  schema,
  title,
  description,
  onSubmit,
  disabled,
  footer,
}: FormRendererProps): React.ReactElement {
  const fields = schema.fields;
  const settings = schema.settings;

  const [values, setValues] = useState<FormValues>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(() => groupPages(fields)[0]?.pageNum ?? 1);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const pages = useMemo(() => groupPages(fields), [fields]);
  const totalPages = Math.max(pages.length, 1);
  const pageIdx = Math.max(
    pages.findIndex((p) => p.pageNum === currentPage),
    0,
  );
  const currentFields = pages[pageIdx]?.fields ?? [];
  const isLastPage = pageIdx === totalPages - 1;

  const visibleFields = useMemo(
    () =>
      currentFields.filter((f) => evaluateConditionalVisibility(f.conditionalVisibility, values)),
    [currentFields, values],
  );

  const handleChange = useCallback((id: string, v: unknown) => {
    setValues((prev) => ({ ...prev, [id]: v }));
    setErrors((prev) => {
      if (!prev[id]) {
        return prev;
      }
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const validatePage = (): boolean => {
    const pageErrors = validateForm(visibleFields, values);
    setErrors(pageErrors);
    return Object.keys(pageErrors).length === 0;
  };

  const handleNext = (): void => {
    if (!validatePage()) {
      return;
    }
    const sequentialNext = pages[pageIdx + 1]?.pageNum ?? currentPage;
    const target = evaluateNavigationRules(schema.navigationRules ?? [], values, sequentialNext);
    setCurrentPage(pages.some((p) => p.pageNum === target) ? target : sequentialNext);
    setErrors({});
  };

  const handlePrev = (): void => {
    const prevPageNum = pages[pageIdx - 1]?.pageNum;
    if (prevPageNum !== undefined) {
      setCurrentPage(prevPageNum);
      setErrors({});
    }
  };

  const handleSubmit = async (): Promise<void> => {
    if (!validatePage()) {
      return;
    }
    setSubmitError(null);
    if (onSubmit) {
      setSubmitting(true);
      try {
        await onSubmit(values);
      } catch (err) {
        setSubmitError(err instanceof Error ? err.message : 'Submission failed — please retry.');
        return;
      } finally {
        setSubmitting(false);
      }
    }
    setSubmitted(true);
  };

  const errorCount = Object.keys(errors).length;
  const progress = totalPages > 1 ? ((pageIdx + 1) / totalPages) * 100 : null;

  if (fields.length === 0) {
    return (
      <p className="text-muted-foreground p-8 text-center text-sm">This form has no fields yet.</p>
    );
  }

  if (submitted) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
        <p className="text-lg font-semibold text-green-800">
          {settings?.successTitle ?? 'Thank you!'}
        </p>
        <p className="mt-1 text-sm text-green-600">
          {settings?.successMessage ?? 'Your submission has been received.'}
        </p>
      </div>
    );
  }

  return (
    <div>
      {progress !== null && settings?.showProgressBar !== false && (
        <div className="mb-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-muted-foreground text-xs font-medium">
              Page {pageIdx + 1} of {totalPages}
            </span>
            <span className="text-muted-foreground/70 text-xs">{Math.round(progress)}%</span>
          </div>
          <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
            <div
              className="bg-primary h-full rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-5">
        {pageIdx === 0 && (title || description) && (
          <div>
            {title && <h2 className="text-foreground text-xl font-bold leading-tight">{title}</h2>}
            {description && (
              <p className="text-muted-foreground mt-1 text-sm leading-snug">{description}</p>
            )}
          </div>
        )}

        {visibleFields.map((field) => (
          <FieldWrapper
            key={field.id}
            field={field}
            value={values[field.id]}
            error={errors[field.id]}
            disabled={disabled}
            onChange={(v) => handleChange(field.id, v)}
          />
        ))}

        {errorCount > 0 && (
          <div
            className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border px-3 py-2.5 text-xs"
            role="alert"
          >
            Please fix {errorCount} error{errorCount !== 1 ? 's' : ''} before continuing.
          </div>
        )}

        {submitError && (
          <div
            className="border-destructive/30 bg-destructive/5 text-destructive rounded-lg border px-3 py-2.5 text-sm"
            role="alert"
          >
            {submitError}
          </div>
        )}

        <div className="flex gap-2.5 pt-1">
          {pageIdx > 0 && (
            <button
              type="button"
              onClick={handlePrev}
              disabled={disabled || submitting}
              className="border-input text-muted-foreground hover:bg-muted/50 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-60"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={isLastPage ? () => void handleSubmit() : handleNext}
            disabled={disabled || submitting}
            className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {submitting
              ? 'Submitting…'
              : isLastPage
                ? (settings?.submitButtonText ?? 'Submit')
                : 'Next'}
          </button>
        </div>

        {footer}
      </div>
    </div>
  );
}
