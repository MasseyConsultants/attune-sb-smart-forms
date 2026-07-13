// Author: Robert Massey | Created: 2026-07-13 | Module: @attune-sb/form-engine
// Purpose: Web form rendering engine — ported from the enterprise
// @attune/form-engine with the React Native renderer replaced by DOM
// components. Logic modules (visibility, navigation, validation) are verbatim.

// --- Core renderers ---
export { FormRenderer } from './components/form-renderer';
export type { FormRendererProps, FormValues } from './components/form-renderer';
export { FieldWrapper } from './components/field-wrapper';
export { FieldInput } from './components/field-input';
export { normalizeOptions } from './components/field-props';
export type { BaseFieldProps } from './components/field-props';

// --- Logic functions (pure TS — safe in API code) ---
export { evaluateConditionalVisibility } from './logic/conditional-visibility';
export { evaluateNavigationRules } from './logic/navigation-rules';
export { validateForm } from './logic/validate-form';
export type { ValidationErrors } from './logic/validate-form';

// --- Field registry ---
export { FIELD_DEFINITIONS, getFieldDefinition } from './registry/field-definitions';
export type { FieldTypeDefinition } from './registry/field-definitions';

// --- Type re-exports for convenience ---
export type {
  FieldDefinition,
  FieldType,
  ConditionalVisibility,
  ConditionalRule,
  ConditionalOperator,
  FieldValidation,
  FormSettings,
  FormSchema,
  NavigationRule,
} from '@attune-sb/shared-types';

export const FORM_ENGINE_VERSION = '0.3.0';
