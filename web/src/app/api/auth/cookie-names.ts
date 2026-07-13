// Cookie names shared across all auth route handlers.
// Separate file: route files may only export handlers in Next.js 15.
export const COOKIE_ACCESS_TOKEN = 'access_token';
export const COOKIE_REFRESH_TOKEN = 'refresh_token';
export const COOKIE_SESSION_ACTIVE = 'session_active';
export const COOKIE_ACCESS_EXP = 'access_token_exp';
export const COOKIE_REFRESHING = 'token_refreshing';
