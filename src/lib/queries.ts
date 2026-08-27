import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { AnalyticsFilters, EntityListFilters } from './schemas';

/** Query keys, centralized so `upload/page.tsx` can invalidate the same
 * groups this file reads from without duplicating the key shapes. */
export const queryKeys = {
  jurisdictions: ['jurisdictions'] as const,
  entities: (filters: EntityListFilters) => ['entities', filters] as const,
  suggestions: (q: string) => ['suggestions', q] as const,
  analytics: (filters: AnalyticsFilters) => ['analytics', filters] as const,
};

/** Distinct jurisdictions for filter dropdowns — shared across the list and
 * analytics pages, so navigating between them no longer refetches it. */
export function useJurisdictions() {
  return useQuery({
    queryKey: queryKeys.jurisdictions,
    queryFn: ({ signal }) => api.getJurisdictions(signal),
  });
}

/** One page of top-level entities. `placeholderData: keepPreviousData` holds
 * the last page on screen while a new one loads (matching the old
 * `entities === null` "only the very first load shows a spinner" behavior),
 * and each filters+page combo is cached independently so paging back doesn't
 * refetch. */
export function useEntities(filters: EntityListFilters) {
  return useQuery({
    queryKey: queryKeys.entities(filters),
    queryFn: ({ signal }) => api.listEntities(filters, signal),
    placeholderData: keepPreviousData,
  });
}

/** Search-bar autocomplete suggestions. Disabled for an empty query — the
 * caller is expected to pass an already-debounced value. */
export function useSuggestions(q: string) {
  return useQuery({
    queryKey: queryKeys.suggestions(q),
    queryFn: ({ signal }) => api.getSuggestions(q, signal),
    enabled: q.trim() !== '',
  });
}

/** The four analytics-page charts for a given filter set. */
export function useAnalytics(filters: AnalyticsFilters) {
  return useQuery({
    queryKey: queryKeys.analytics(filters),
    queryFn: ({ signal }) => api.getAnalytics(filters, signal),
  });
}
