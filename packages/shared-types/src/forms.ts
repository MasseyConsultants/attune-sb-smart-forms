// Author: Robert Massey | Created: 2026-07-12 | Module: @attune-sb/shared-types
// Purpose: Form schema contracts shared by the form engine, API, and builder.
// Ported from the enterprise edition shared-types core.

export enum FormStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum SubmissionStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  // SMB addition: public submissions accepted over the plan cap are stored
  // and quarantined, never dropped (design rule 4 in MASTER_PLAN §3).
  OVER_LIMIT = 'OVER_LIMIT',
}

export interface FieldDefinition {
  id: string;
  type: FieldType;
  label: string;
  description?: string;
  required: boolean;
  config: Record<string, unknown>;
  conditionalVisibility?: ConditionalVisibility;
  validations?: FieldValidation[];
  sortOrder: number;
  page: number;
}

export type FieldType =
  | 'text'
  | 'multiline'
  | 'textarea'
  | 'number'
  | 'email'
  | 'phone'
  | 'url'
  | 'dynamiclist'
  | 'dropdown'
  | 'multiselect'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'yesno'
  | 'toggle'
  | 'date'
  | 'time'
  | 'datetime'
  | 'eventtimestamp'
  | 'photo'
  | 'signature'
  | 'barcode'
  | 'gps'
  | 'address'
  | 'calculated'
  | 'currentuser'
  | 'rating'
  | 'section'
  | 'pagebreak'
  | 'thankyou';

export interface ConditionalVisibility {
  enabled: boolean;
  rules: ConditionalRule[];
}

export interface ConditionalRule {
  fieldId: string;
  operator: ConditionalOperator;
  /** Omitted for value-less operators (is_empty / is_not_empty). */
  value?: unknown;
}

export type ConditionalOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'greater_than'
  | 'less_than'
  | 'is_empty'
  | 'is_not_empty';

export interface FieldValidation {
  type: 'min' | 'max' | 'pattern' | 'minLength' | 'maxLength' | 'custom';
  value: unknown;
  message: string;
}

export interface FormSettings {
  enablePageNavigation?: boolean;
  showProgressBar?: boolean;
  submitButtonText?: string;
  successTitle?: string;
  successMessage?: string;
  successRedirectUrl?: string;
  // Public form abuse controls (SMB — public fill pages)
  captchaEnabled?: boolean;
  honeypotEnabled?: boolean;
}

// Determines which page the form engine navigates to when the user taps Next.
// First-match wins; falls through to the next sequential page when no rule matches.
export interface NavigationRule {
  readonly id: string;
  readonly fieldId: string;
  readonly operator: 'equals' | 'not_equals' | 'contains' | 'is_empty' | 'is_not_empty';
  readonly value?: unknown;
  /** 1-indexed target page number. */
  readonly targetPage: number;
}

export interface FormSchema {
  fields: FieldDefinition[];
  settings?: FormSettings;
  navigationRules?: NavigationRule[];
}

// --- API-facing entity shapes ---

export interface Form {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  schema: FormSchema | null;
  status: FormStatus;
  version: number;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface FormVersion {
  id: string;
  formId: string;
  version: number;
  schema: FormSchema;
  changelog: string | null;
  publishedAt: string;
}

export interface Submission {
  id: string;
  formId: string;
  formVersion: number;
  userId: string | null;
  data: Record<string, unknown>;
  status: SubmissionStatus;
  submittedAt: string | null;
  organizationId: string;
  createdAt: string;
}
