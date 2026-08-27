'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/** One QueryClient per browser session (not per render) — created lazily in
 * useState so it survives re-renders but isn't shared across users/requests,
 * which matters once this ever runs somewhere with server-side rendering. */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data only changes via /api/upload, which explicitly invalidates
            // the affected queries — so treat cached data as fresh
            // indefinitely between uploads rather than refetching on every
            // mount/window-focus.
            staleTime: Infinity,
            retry: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
