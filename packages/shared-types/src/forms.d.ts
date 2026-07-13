export declare enum FormStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}
export declare enum SubmissionStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
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
  value: unknown;
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
  captchaEnabled?: boolean;
  honeypotEnabled?: boolean;
}
export interface NavigationRule {
  readonly id: string;
  readonly fieldId: string;
  readonly operator: 'equals' | 'not_equals' | 'contains' | 'is_empty' | 'is_not_empty';
  readonly value?: unknown;
  readonly targetPage: number;
}
export interface FormSchema {
  fields: FieldDefinition[];
  settings?: FormSettings;
  navigationRules?: NavigationRule[];
}
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
