// Author: Robert Massey | Created: 2026-07-16 | Module: Web / Hooks

'use client';

import { useEffect, useState } from 'react';

/** Returns `value` after it has stayed unchanged for `delayMs`. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}
