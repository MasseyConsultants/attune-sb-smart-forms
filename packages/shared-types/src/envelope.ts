// Author: Robert Massey | Created: 2026-07-12 | Module: @attune-sb/shared-types
// Purpose: Standard API response envelope shared by the API and web clients.
// Ported from the enterprise edition.

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error?: ApiError;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

// PaginatedResponse is intentionally standalone (not extending ApiResponse) because
// its meta is always a required PaginationMeta, which is incompatible with ApiResponse's
// optional Record<string, unknown> meta.
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[] | null;
  error?: ApiError;
  meta: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  timestamp?: string;
}

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Error payload attached to a 402 LIMIT_EXCEEDED response so the web can render
// an upgrade modal with real numbers rather than a generic error toast.
export interface LimitExceededDetails {
  readonly entitlement: string;
  readonly limit: number;
  readonly used: number;
  readonly resetsAt: string | null;
  readonly upgradeUrl: string;
}
