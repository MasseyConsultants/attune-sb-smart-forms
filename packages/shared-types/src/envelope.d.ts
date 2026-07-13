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
export interface LimitExceededDetails {
  readonly entitlement: string;
  readonly limit: number;
  readonly used: number;
  readonly resetsAt: string | null;
  readonly upgradeUrl: string;
}
