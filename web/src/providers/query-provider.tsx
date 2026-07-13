// Author: Robert Massey | Created: 2026-07-12 | Module: Web / Providers
// Purpose: TanStack React Query client provider. Ported from enterprise.

'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Don't retry on 4xx errors — they're client mistakes, not transient failures.
        retry: (failureCount, error) => {
          if (error instanceof Error && 'status' in error) {
            const status = (error as Error & { status: number }).status;
            if (status >= 400 && status < 500) return false;
          }
          return failureCount < 2;
        },
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export interface QueryProviderProps {
  readonly children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps): React.ReactElement {
  // useState prevents QueryClient recreation on strict-mode double render.
  const [queryClient] = useState(makeQueryClient);

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
